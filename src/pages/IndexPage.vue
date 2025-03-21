<template>
  <div class="mx-auto p-4">
    <div v-if="userStore.loading" class="flex justify-center items-center h-[90vh]">
      <div class="text-center">
        <q-spinner-dots size="60px" color="amber" />
        <p class="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>

    <div v-else-if="!userStore.isLoggedIn" class="flex flex-col items-center justify-center h-[90vh]">
      <div class="text-center max-w-md">
        <h1 class="text-3xl font-bold text-amber-600 mb-6">Meow Log</h1>
        <p class="text-gray-600 mb-8">Track your pet's health and daily feeding</p>
        <button 
          @click="login" 
          class="flex items-center justify-center bg-white border border-gray-300 rounded-lg px-6 py-3 text-gray-700 hover:bg-gray-50 focus:outline-none shadow-sm transition mx-auto"
        >
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" class="w-5 h-5 mr-2" />
          使用Google登入
        </button>
      </div>
    </div>

    <div v-else-if="!userStore.hasFamily" class="flex flex-col items-center justify-center h-[90vh]">
      <div class="text-center max-w-md">
        <h1 class="text-2xl font-bold text-amber-600 mb-4">歡迎, {{ userStore.user.displayName }}</h1>
        <p class="text-gray-600 mb-8">尚未加入或建立家庭。請選擇以下選項：</p>
        
        <div class="mb-4">
          <button 
            @click="showCreateFamilyDialog = true" 
            class="w-full bg-amber-600 text-white rounded-lg px-6 py-3 hover:bg-amber-700 focus:outline-none shadow-md transition"
          >
            建立新家庭
          </button>
        </div>

        <div>
          <button 
            @click="showJoinFamilyDialog = true" 
            class="w-full bg-white border border-gray-300 text-gray-700 rounded-lg px-6 py-3 hover:bg-gray-50 focus:outline-none shadow-sm transition"
          >
            加入已存在的家庭
          </button>
        </div>
      </div>
    </div>


    <div v-else class="max-w-4xl mx-auto">
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h1 class="text-2xl font-bold text-amber-600">{{ userStore.family.name }}</h1>
          <div class="flex items-center">
            <p class="text-sm text-gray-500 mr-2">歡迎, {{ userStore.user.displayName }}</p>
            <q-btn 
              flat 
              round 
              size="sm" 
              color="grey-6" 
              icon="logout" 
              @click="showLeaveConfirm = true"
              title="退出家庭"
            />
          </div>
        </div>
        
        <div class="bg-amber-50 p-4 rounded-lg border border-amber-100 mb-4">
          <div class="flex justify-between items-center">
            <div>
              <p class="text-sm text-amber-800 font-medium mb-1">你的家庭 ID：</p>
              <p class="text-sm text-gray-700 font-mono bg-white px-3 py-2 rounded border border-amber-200">
                {{ userStore.family.id }}
              </p>
            </div>
            <button 
              @click="copyFamilyId" 
              class="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200 flex items-center"
            >
              <span v-if="!isCopied">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                複製 ID
              </span>
              <span v-else>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                已複製
              </span>
            </button>
          </div>
          <p class="text-xs text-amber-700 mt-2">
            分享此 ID 給家人，讓他們可以加入你的家庭
          </p>
        </div>
        
        <!-- Pets List -->
        <div class="mb-4 pt-2">
          <pet-list 
            :pets="petStore.pets" 
            :loading="petStore.loading"
            @add-pet="showAddPetDialog = true"
            @select-pet="selectPet"
            @edit-pet="editPet"
            @delete-pet="deletePet"
          />
        </div>
      </div>
    </div>

    <!-- Create Family Dialog -->
    <q-dialog v-model="showCreateFamilyDialog" persistent>
      <q-card class="w-full max-w-md">
        <q-card-section class="row items-center">
          <div class="text-h6">建立新家庭</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-input 
            v-model="newFamilyName" 
            label="家庭名稱" 
            dense 
            outlined
            :rules="[val => !!val || '請輸入家庭名稱']"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn 
            label="建立" 
            color="amber-8" 
            :loading="isCreatingFamily"
            :disable="!newFamilyName"
            @click="createNewFamily" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Join Family Dialog -->
    <q-dialog v-model="showJoinFamilyDialog" persistent>
      <q-card class="w-full max-w-md">
        <q-card-section class="row items-center">
          <div class="text-h6">加入家庭</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-input 
            v-model="familyIdToJoin" 
            label="家庭ID" 
            dense 
            outlined
            :rules="[val => !!val || '請輸入家庭ID']"
            hint="請輸入家庭管理員提供的家庭ID"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn 
            label="加入" 
            color="amber-8" 
            :loading="isJoiningFamily"
            :disable="!familyIdToJoin"
            @click="joinExistingFamily" 
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Add Pet Dialog -->
    <q-dialog v-model="showAddPetDialog" persistent>
      <q-card class="w-full max-w-2xl">
        <q-card-section class="row items-center">
          <div class="text-h6">新增毛孩</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <add-pet-form 
            @submit="handleAddPet" 
            @cancel="showAddPetDialog = false"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    
    <!-- Edit Pet Dialog -->
    <q-dialog v-model="showEditPetDialog" persistent>
      <q-card class="w-full max-w-2xl">
        <q-card-section class="row items-center">
          <div class="text-h6">編輯毛孩</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <edit-pet-form 
            v-if="selectedPet"
            :pet="selectedPet"
            @submit="handleEditPet" 
            @cancel="showEditPetDialog = false"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
    
    <!-- Leave Family Confirm Dialog -->
    <confirm-dialog
      v-model="showLeaveConfirm"
      title="退出家庭"
      message="確定要退出當前家庭嗎？退出後將無法再查看此家庭中的寵物資訊。"
      confirm-label="退出"
      confirm-color="red"
      :loading="isLeavingFamily"
      @confirm="leaveFamily"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth, provider, signInWithPopup } from 'src/boot/firebase'
import { useUserStore } from 'src/stores/userStore'
import { usePetStore } from 'src/stores/petStore'
import { notification } from 'src/boot/notification'
import PetList from '../components/PetList.vue'
import AddPetForm from '../components/AddPetForm.vue'
import EditPetForm from '../components/EditPetForm.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useRouter } from 'vue-router'

// Get user store
const userStore = useUserStore()
// Get pet store
const petStore = usePetStore()
// Get router
const router = useRouter()

// UI state variables
const showCreateFamilyDialog = ref(false)
const showJoinFamilyDialog = ref(false)
const newFamilyName = ref('')
const familyIdToJoin = ref('')
const isCreatingFamily = ref(false)
const isJoiningFamily = ref(false)
const isCopied = ref(false)
const showAddPetDialog = ref(false)
const showEditPetDialog = ref(false)
const selectedPet = ref(null)
const showLeaveConfirm = ref(false)
const isLeavingFamily = ref(false)

// Init auth on component mount
onMounted(async () => {
  // Check authentication state on load
  await userStore.initAuth()
  
  if (userStore.hasFamily) {
    await petStore.fetchFamilyPets()
  }
  const urlParams = new URLSearchParams(window.location.search)
  const joinId = urlParams.get('join')
  
  if (joinId) {
    // Wait for authentication state
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setTimeout(() => {
          // Wait for store initialization
          if (!userStore.hasFamily) {
            familyIdToJoin.value = joinId
            showJoinFamilyDialog.value = true
          } else if (userStore.family.id !== joinId) {
            notification.info(`已經是「${userStore.family.name}」的成員，無法加入其他家庭`)
          }
        }, 1000)
        unsubscribe()
      }
    })
    
    // 清除URL參數，避免重新整理頁面時重複處理
    window.history.replaceState({}, document.title, window.location.pathname)
  }
})

// Login with Google
const login = () => {
  signInWithPopup(auth, provider).then(result => {
    console.log('登入成功', result.user)
    notification.success('登入成功')
    // The auth state change listener in userStore will handle the rest
  }).catch(error => {
    console.error('登入錯誤', error)
    notification.error('登入失敗，請重試')
  })
}

// Create new family
const createNewFamily = async () => {
  if (!newFamilyName.value) return
  
  isCreatingFamily.value = true
  
  try {
    const result = await userStore.createFamily(newFamilyName.value)
    
    if (result) {
      showCreateFamilyDialog.value = false
      newFamilyName.value = ''
      notification.success('家庭建立成功！')
      await petStore.fetchFamilyPets()
    } else {
      throw new Error('建立家庭失敗')
    }
  } catch (error) {
    console.error('建立家庭錯誤', error)
    notification.error(error.message || '建立家庭失敗，請重試')
  } finally {
    isCreatingFamily.value = false
  }
}

// Join existing family
const joinExistingFamily = async () => {
  if (!familyIdToJoin.value) return
  
  isJoiningFamily.value = true
  
  try {
    const result = await userStore.joinFamily(familyIdToJoin.value)
    
    if (result) {
      showJoinFamilyDialog.value = false
      familyIdToJoin.value = ''
      notification.success('成功加入家庭！')
      await petStore.fetchFamilyPets()
    } else {
      throw new Error('加入家庭失敗')
    }
  } catch (error) {
    console.error('加入家庭錯誤', error)
    notification.error(error.message || '加入家庭失敗，請重試')
  } finally {
    isJoiningFamily.value = false
  }
}

// Copy family ID
const copyFamilyId = () => {
  if (userStore.family && userStore.family.id) {
    navigator.clipboard.writeText(userStore.family.id)
      .then(() => {
        isCopied.value = true
        notification.success('家庭 ID 已複製到剪貼簿')
        
        // 2秒後重設狀態
        setTimeout(() => {
          isCopied.value = false
        }, 2000)
      })
      .catch(err => {
        console.error('複製失敗', err)
        notification.error('複製失敗，請手動複製')
      })
  }
}

// Handle adding a new pet
const handleAddPet = async (petData) => {
  try {
    await petStore.addPet(petData)
    showAddPetDialog.value = false
    notification.success('毛孩新增成功！')
  } catch (error) {
    console.error('添加毛孩失敗:', error)
    notification.error(error.message || '添加毛孩失敗，請重試')
  }
}

// Handle editing a pet
const editPet = (pet) => {
  selectedPet.value = pet
  showEditPetDialog.value = true
}

// Handle updating a pet
const handleEditPet = async (petData) => {
  try {
    const petId = petData.id
    delete petData.id // 删除ID以便更新其他字段
    
    const success = await petStore.updatePet(petId, petData)
    
    if (success) {
      showEditPetDialog.value = false
      selectedPet.value = null
      notification.success('毛孩更新成功！')
    } else {
      throw new Error('更新失敗')
    }
  } catch (error) {
    console.error('更新毛孩失敗:', error)
    notification.error(error.message || '更新毛孩失敗，請重試')
  }
}

// Handle deleting a pet
const deletePet = async (pet) => {
  try {
    const success = await petStore.deletePet(pet.id)
    
    if (success) {
      notification.success(`已刪除寵物 ${pet.name}`)
    } else {
      throw new Error('刪除失敗')
    }
  } catch (error) {
    console.error('刪除毛孩失敗:', error)
    notification.error(error.message || '刪除毛孩失敗，請重試')
  }
}

// Handle selecting a pet
const selectPet = (pet) => {
  router.push({ 
    name: 'pet-details', 
    params: { id: pet.id }
  });
}

// Handle leaving family
const leaveFamily = async () => {
  isLeavingFamily.value = true;
  try {
    const success = await userStore.leaveFamily();
    
    if (success) {
      notification.success('已退出家庭');
    } else {
      throw new Error('退出家庭失敗');
    }
  } catch (error) {
    console.error('Error:', error);
    notification.error(error.message || '退出家庭失敗，請重試');
  } finally {
    isLeavingFamily.value = false;
    showLeaveConfirm.value = false;
  }
};

</script>
