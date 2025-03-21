import { defineStore } from 'pinia';
import { ref } from 'vue';
import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp,
  updateDoc,
  doc,
  deleteDoc,
  getDoc
} from 'src/boot/firebase';
import { useUserStore } from './userStore';

export const usePetStore = defineStore('pet', () => {
  const pets = ref([]);
  const loading = ref(false);
  const userStore = useUserStore();
  
  // Calculate age from birthDate
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    
    let age = today.getFullYear() - birthDateObj.getFullYear();
    
    // 調整年齡：如果今年的生日還沒到，則年齡減1
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Fetch family pets
  const fetchFamilyPets = async () => {
    if (!userStore.hasFamily) return [];
    
    loading.value = true;
    try {
      const petsQuery = query(
        collection(db, 'pets'),
        where('familyId', '==', userStore.family.id)
      );
      
      const querySnapshot = await getDocs(petsQuery);
      const petsList = [];
      
      querySnapshot.forEach((doc) => {
        const petData = doc.data();
        
        // Handle old data that might not have birthDate
        // If there is age but no birthDate, calculate an estimated birthDate
        if (petData.age !== undefined && petData.birthDate === undefined) {
          const today = new Date();
          const birthYear = today.getFullYear() - petData.age;
          const estimatedBirthDate = new Date(birthYear, today.getMonth(), today.getDate());
          petData.birthDate = estimatedBirthDate.toISOString().split('T')[0];
          
          // Update pet birthDate in database
          updatePetBirthDate(doc.id, petData.birthDate);
        }
        
        petsList.push({
          id: doc.id,
          ...petData
        });
      });
      
      pets.value = petsList;
      return petsList;
    } catch (error) {
      console.error('Failed to fetch pets:', error);
      return [];
    } finally {
      loading.value = false;
    }
  };
  
  // Update pet birthDate
  const updatePetBirthDate = async (petId, birthDate) => {
    try {
      const petRef = doc(db, 'pets', petId);
      await updateDoc(petRef, { 
        birthDate: birthDate,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Failed to update pet birthDate:', error);
      return false;
    }
  };
  
  // add pet
  const addPet = async (petData) => {
    if (!userStore.hasFamily) {
      throw new Error('You need to join or create a family first');
    }
    
    try {
      // Calculate current age if birthDate is provided but age is not
      if (petData.birthDate && petData.age === undefined) {
        petData.age = calculateAge(petData.birthDate);
      }
      
      const newPet = {
        ...petData,
        familyId: userStore.family.id,
        createdBy: userStore.user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'pets'), newPet);
      
      // add id and return pet data
      const addedPet = {
        id: docRef.id,
        ...newPet,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // update data
      pets.value.push(addedPet);
      
      return addedPet;
    } catch (error) {
      console.error('failed to add pet:', error);
      throw error;
    }
  };
  
  // update pet
  const updatePet = async (petId, petData) => {
    try {
      const petRef = doc(db, 'pets', petId);
      
      // Calculate current age if birthDate is provided but age is not
      if (petData.birthDate && petData.age === undefined) {
        petData.age = calculateAge(petData.birthDate);
      }
      
      const updatedData = {
        ...petData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(petRef, updatedData);
      
      // update local pet data
      const petIndex = pets.value.findIndex(p => p.id === petId);
      if (petIndex !== -1) {
        pets.value[petIndex] = {
          ...pets.value[petIndex],
          ...updatedData,
          updatedAt: new Date()
        };
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update pet:', error);
      return false;
    }
  };
  
  // delete pet
  const deletePet = async (petId) => {
    try {
      const petRef = doc(db, 'pets', petId);
      await deleteDoc(petRef);

      const petIndex = pets.value.findIndex(p => p.id === petId);
      if (petIndex !== -1) {
        pets.value.splice(petIndex, 1);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to delete pet:', error);
      return false;
    }
  };
  
  // get pet by id
  const getPetById = async (petId, forceRefresh = false) => {
    // If not forced refresh and there is cache, return cached data
    if (!forceRefresh && pets.value.length > 0) {
      const cachedPet = pets.value.find(p => p.id === petId);
      if (cachedPet) return cachedPet;
    }
    
    if (!userStore.isLoggedIn || !userStore.hasFamily) {
      return null;
    }
    
    try {
      const petRef = doc(db, 'pets', petId);
      const petDoc = await getDoc(petRef);
      
      if (petDoc.exists()) {
        const petData = petDoc.data();
        
        // Check if pet belongs to current family
        if (petData.familyId === userStore.family.id) {
          const pet = {
            id: petId,
            ...petData
          };
          
          // If forced refresh, update cached pet data
          if (forceRefresh && pets.value.length > 0) {
            const index = pets.value.findIndex(p => p.id === petId);
            if (index !== -1) {
              pets.value[index] = pet;
            }
          }
          
          return pet;
        }
      }
    } catch (error) {
      console.error('Get pet data failed:', error);
    }
    
    return null;
  };
  
  return {
    pets,
    loading,
    fetchFamilyPets,
    addPet,
    updatePet,
    updatePetBirthDate,
    calculateAge,
    deletePet,
    getPetById
  };
}); 