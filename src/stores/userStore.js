import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  auth, 
  onAuthStateChanged, 
  db, 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  setDoc,
  serverTimestamp
} from 'src/boot/firebase'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref(null)
  const family = ref(null)
  const loading = ref(true)

  // Getters
  const isLoggedIn = computed(() => user.value !== null)
  const hasFamily = computed(() => family.value !== null)
  const userId = computed(() => user.value?.uid)

  // Actions
  // Initialize auth state listener
  const initAuth = () => {
    loading.value = true
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (userData) => {
        if (userData) {
          user.value = userData
          await loadUserFamily()
          resolve(userData)
        } else {
          user.value = null
          family.value = null
          resolve(null)
        }
        loading.value = false
      })
    })
  }

  // Load user's family data
  const loadUserFamily = async () => {
    if (!user.value) return null

    try {
      // Check if user belongs to any family
      const userFamiliesQuery = query(
        collection(db, 'familyMembers'),
        where('userId', '==', user.value.uid),
        where('active', '!=', false)
      )
      
      const querySnapshot = await getDocs(userFamiliesQuery)
      
      if (!querySnapshot.empty) {
        // User belongs to at least one family
        const familyMember = querySnapshot.docs[0].data()
        
        // Get the family details
        const familyDoc = await getDoc(doc(db, 'families', familyMember.familyId))
        
        if (familyDoc.exists()) {
          family.value = {
            id: familyDoc.id,
            ...familyDoc.data()
          }
        }
      } else {
        family.value = null
      }
      
      return family.value
    } catch (error) {
      console.error('Load family data failed', error)
      family.value = null
      return null
    }
  }

  // Create a new family and add current user as member
  const createFamily = async (familyName) => {
    if (!user.value) return null

    try {
      const simpleData = {
        name: familyName,
        createdBy: user.value.uid
      };
      
      const newFamilyRef = await addDoc(collection(db, 'families'), simpleData);
      
      const memberDocId = `${user.value.uid}_${newFamilyRef.id}`;
      
      const memberData = {
        familyId: newFamilyRef.id,
        userId: user.value.uid,
        role: 'admin',
        active: true,
        joinedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'familyMembers', memberDocId), memberData);
      await loadUserFamily();
      
      // Add explicit check
      if (!family.value) {
        console.error('Failed to get family data after creating');
        return false;
      }
      return family.value;
    } catch (error) {
      console.error('Create family failed', error);
      throw error;
    }
  }

  // Join an existing family
  const joinFamily = async (familyId) => {
    if (!user.value) return null

    try {
      // Check if family exists
      const familyRef = doc(db, 'families', familyId)
      const familyDoc = await getDoc(familyRef)
      
      if (!familyDoc.exists()) {
        throw new Error('Family does not exist')
      }

      // Check if user is already a member
      const memberDocId = `${user.value.uid}_${familyId}`
      const memberDoc = await getDoc(doc(db, 'familyMembers', memberDocId))
      
      if (memberDoc.exists()) {
        throw new Error('You are already a member of this family')
      }

      // Add user as family member with custom ID
      await setDoc(doc(db, 'familyMembers', memberDocId), {
        familyId: familyId,
        userId: user.value.uid,
        role: 'member', // Joining users are regular members
        active: true,
        joinedAt: serverTimestamp(),
      })

      // Load the joined family
      await loadUserFamily()
      
      return family.value
    } catch (error) {
      console.error('Join family failed', error)
      return null
    }
  }
  
  // Leave current family
  const leaveFamily = async () => {
    if (!user.value || !family.value) return false
    
    try {
      // Get the member document ID
      const memberDocId = `${user.value.uid}_${family.value.id}`
      
      // Delete the member document
      await setDoc(doc(db, 'familyMembers', memberDocId), {
        familyId: family.value.id,
        userId: user.value.uid,
        leftAt: serverTimestamp(),
        active: false
      }, { merge: true })
      
      // Update local state
      family.value = null
      
      return true
    } catch (error) {
      console.error('Leave family failed', error)
      return false
    }
  }

  return {
    // State
    user,
    family,
    loading,
    
    // Getters
    isLoggedIn,
    hasFamily,
    userId,
    
    // Actions
    initAuth,
    loadUserFamily,
    createFamily,
    joinFamily,
    leaveFamily
  }
}) 