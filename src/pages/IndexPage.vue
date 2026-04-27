<template>
  <div class="index-page">
    <!-- Loading -->
    <div v-if="userStore.loading" class="flex justify-center items-center h-[90vh]">
      <div class="text-center">
        <q-spinner-dots size="60px" color="primary" />
        <p class="mt-4" style="color: var(--ml-text-sec)">載入中...</p>
      </div>
    </div>

    <!-- Not logged in -->
    <div v-else-if="!userStore.isLoggedIn" class="flex flex-col items-center justify-center h-[90vh] px-6">
      <div class="text-center max-w-sm w-full">
        <div class="login-hero mb-8">
          <q-icon name="pets" style="font-size: 52px; color: var(--ml-primary);" />
        </div>
        <h1 class="text-3xl font-bold mb-2" style="color: var(--ml-primary); letter-spacing: -0.03em;">Meow Log</h1>
        <p class="mb-8" style="color: var(--ml-text-sec); font-size: 14px;">記錄毛孩的日常健康與飲食</p>
        <button @click="login" class="google-login-btn">
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google" class="w-5 h-5" />
          使用 Google 登入
        </button>
      </div>
    </div>

    <!-- No family -->
    <div v-else-if="!userStore.hasFamily" class="flex flex-col items-center justify-center h-[90vh] px-6">
      <div class="text-center max-w-sm w-full">
        <h1 class="text-xl font-bold mb-2" style="color: var(--ml-text);">歡迎，{{ userStore.user.displayName }}</h1>
        <p class="mb-8" style="color: var(--ml-text-sec); font-size: 14px;">請先建立或加入一個家庭來管理毛孩</p>
        <div class="flex flex-col gap-3">
          <button @click="showCreateFamilyDialog = true" class="ml-btn-primary" style="padding: 14px 20px; font-size: 15px; border-radius: 14px;">
            建立新家庭
          </button>
          <button @click="showJoinFamilyDialog = true" class="ghost-btn">
            加入已存在的家庭
          </button>
        </div>
      </div>
    </div>

    <!-- Main content -->
    <div v-else class="main-content">
      <!-- Family header card -->
      <div class="family-header-card">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="family-name">{{ userStore.family.name }}</div>
            <div class="welcome-text">歡迎，{{ userStore.user.displayName }}</div>
          </div>
          <div class="flex gap-2">
            <button @click="openSettings" class="icon-btn" title="家庭設定">
              <q-icon name="settings" style="font-size: 18px;" />
            </button>
            <button @click="showLeaveConfirm = true" class="icon-btn" title="退出家庭">
              <q-icon name="logout" style="font-size: 18px;" />
            </button>
          </div>
        </div>

        <!-- Family ID -->
        <div class="family-id-box">
          <p class="family-id-label">家庭 ID</p>
          <div class="flex items-center gap-3">
            <p class="family-id-value">{{ userStore.family.id }}</p>
            <button @click="copyFamilyId" class="copy-btn" :class="{ copied: isCopied }">
              <q-icon :name="isCopied ? 'check' : 'content_copy'" style="font-size: 16px;" />
              <span>{{ isCopied ? '已複製' : '複製' }}</span>
            </button>
          </div>
          <p class="family-id-hint">分享此 ID 給家人，讓他們可以加入你的家庭</p>
        </div>
      </div>

      <!-- Pet list -->
      <div class="px-4 pb-6">
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

    <!-- ── Dialogs (logic unchanged) ── -->

    <q-dialog v-model="showCreateFamilyDialog" persistent>
      <q-card class="ml-dialog">
        <q-card-section class="dialog-header">
          <div class="text-h6">建立新家庭</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-input v-model="newFamilyName" label="家庭名稱" dense outlined
            :rules="[val => !!val || '請輸入家庭名稱']" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn label="建立" color="primary" :loading="isCreatingFamily"
            :disable="!newFamilyName" @click="createNewFamily" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showJoinFamilyDialog" persistent>
      <q-card class="ml-dialog">
        <q-card-section class="dialog-header">
          <div class="text-h6">加入家庭</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-input v-model="familyIdToJoin" label="家庭ID" dense outlined
            :rules="[val => !!val || '請輸入家庭ID']"
            hint="請輸入家庭管理員提供的家庭ID" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn label="加入" color="primary" :loading="isJoiningFamily"
            :disable="!familyIdToJoin" @click="joinExistingFamily" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showAddPetDialog" persistent>
      <q-card class="ml-dialog" style="max-width: 560px;">
        <q-card-section class="dialog-header">
          <div class="text-h6">新增毛孩</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <add-pet-form @submit="handleAddPet" @cancel="showAddPetDialog = false" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showEditPetDialog" persistent>
      <q-card class="ml-dialog" style="max-width: 560px;">
        <q-card-section class="dialog-header">
          <div class="text-h6">編輯毛孩</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <edit-pet-form v-if="selectedPet" :pet="selectedPet"
            @submit="handleEditPet" @cancel="showEditPetDialog = false" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <confirm-dialog
      v-model="showLeaveConfirm"
      title="退出家庭"
      message="確定要退出當前家庭嗎？退出後將無法再查看此家庭中的寵物資訊。"
      confirm-label="退出"
      confirm-color="red"
      :loading="isLeavingFamily"
      @confirm="leaveFamily"
    />

    <q-dialog v-model="showSettingsDialog" persistent>
      <q-card class="ml-dialog ml-dialog--scrollable">
        <q-card-section class="dialog-header">
          <div class="text-h6">家庭設定</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="dialog-body">
          <div class="settings-section-label">熱量計算設定</div>

          <!-- Single pet (or 0 pet): simple form, writes to family.* -->
          <template v-if="petStore.pets.length <= 1">
            <q-input v-model.number="familySettings.wetFoodCalories"
              label="濕食熱量 (kcal / 盒或罐)" type="number" dense outlined class="mb-3" />
            <q-input v-model.number="familySettings.dryFoodCalories"
              label="乾食熱量 (kcal / g)" type="number" dense outlined step="0.1" />
          </template>

          <!-- Multi pet: default group + extra groups -->
          <template v-else>
            <!-- 預設組 (family.*) -->
            <div class="cal-group cal-group--default">
              <div class="cal-group__head">
                <span class="cal-group__title">預設設定</span>
                <span class="cal-group__badge">未綁定寵物將沿用</span>
              </div>
              <q-input v-model.number="familySettings.wetFoodCalories"
                label="濕食熱量 (kcal / 盒或罐)" type="number" dense outlined class="mb-2" />
              <q-input v-model.number="familySettings.dryFoodCalories"
                label="乾食熱量 (kcal / g)" type="number" dense outlined step="0.1" class="mb-2" />
              <div class="cal-group__pets">
                套用對象：{{ unboundPetNames.length ? unboundPetNames.join('、') : '（無，所有寵物皆已個別設定）' }}
              </div>
            </div>

            <div class="cal-extra-divider">額外設定</div>

            <div v-for="(group, idx) in calorieGroups" :key="group.localId" class="cal-group">
              <div class="cal-group__head">
                <span class="cal-group__title">額外設定 #{{ idx + 1 }}</span>
                <button type="button" class="cal-group__remove" @click="removeGroup(idx)">刪除</button>
              </div>
              <q-input v-model.number="group.wetFoodCalories"
                label="濕食熱量 (kcal / 盒或罐)" type="number" dense outlined class="mb-2" />
              <q-input v-model.number="group.dryFoodCalories"
                label="乾食熱量 (kcal / g)" type="number" dense outlined step="0.1" class="mb-2" />
              <q-select v-model="group.petIds" multiple emit-value map-options
                :options="availablePetOptions(idx)"
                label="綁定寵物" dense outlined use-chips />
            </div>

            <button type="button" class="cal-group__add" @click="addGroup">
              + 新增額外設定
            </button>
          </template>
        </q-card-section>
        <q-card-actions align="right" class="dialog-actions">
          <q-btn flat label="取消" color="grey" v-close-popup />
          <q-btn label="儲存" color="primary" :loading="isSavingSettings" @click="saveSettings" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { auth, provider, signInWithPopup } from 'src/boot/firebase'
import { useUserStore } from 'src/stores/userStore'
import { usePetStore } from 'src/stores/petStore'
import { notification } from 'src/boot/notification'
import PetList from '../components/PetList.vue'
import AddPetForm from '../components/AddPetForm.vue'
import EditPetForm from '../components/EditPetForm.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useRouter } from 'vue-router'
import { loadAppSnapshot, clearSnapshot } from 'src/services/appSnapshotService'

const userStore = useUserStore()
const petStore = usePetStore()
const router = useRouter()

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
const showSettingsDialog = ref(false)
const isSavingSettings = ref(false)
const familySettings = reactive({ wetFoodCalories: null, dryFoodCalories: null })
const calorieGroups = ref([])
let _groupLocalId = 0
const nextLocalId = () => ++_groupLocalId

const buildGroupsFromPets = () => {
  const map = new Map()
  for (const pet of petStore.pets) {
    const fc = pet.foodCalories
    if (!fc || (fc.wet == null && fc.dry == null)) continue
    const sig = `${fc.wet ?? ''}|${fc.dry ?? ''}`
    if (!map.has(sig)) {
      map.set(sig, {
        localId: nextLocalId(),
        wetFoodCalories: fc.wet ?? null,
        dryFoodCalories: fc.dry ?? null,
        petIds: [],
      })
    }
    map.get(sig).petIds.push(pet.id)
  }
  return Array.from(map.values())
}

const availablePetOptions = (currentIdx) => {
  const takenElsewhere = new Set()
  calorieGroups.value.forEach((g, i) => {
    if (i === currentIdx) return
    g.petIds.forEach((id) => takenElsewhere.add(id))
  })
  return petStore.pets
    .filter((p) => !takenElsewhere.has(p.id))
    .map((p) => ({ label: p.name, value: p.id }))
}

const unboundPetNames = computed(() => {
  const bound = new Set()
  calorieGroups.value.forEach((g) => g.petIds.forEach((id) => bound.add(id)))
  return petStore.pets.filter((p) => !bound.has(p.id)).map((p) => p.name)
})

const addGroup = () => {
  calorieGroups.value.push({
    localId: nextLocalId(),
    wetFoodCalories: null,
    dryFoodCalories: null,
    petIds: [],
  })
}

const removeGroup = (idx) => {
  calorieGroups.value.splice(idx, 1)
}

watch(() => userStore.hasFamily, (hasFamily) => {
  if (hasFamily && userStore.isLoggedIn) void petStore.fetchFamilyPets()
})

onMounted(async () => {
  const snapshot = await loadAppSnapshot()
  const hasValidSnapshot = snapshot?.userId && snapshot?.user
  if (hasValidSnapshot) {
    userStore.hydrateFromSnapshot(snapshot)
    petStore.hydrateFromSnapshot(snapshot)
    userStore.loading = false
    void (async () => {
      const authUser = await userStore.initAuth({ background: true })
      if (snapshot.userId !== authUser?.uid) void clearSnapshot()
      if (userStore.hasFamily) await petStore.fetchFamilyPets()
    })()
  } else {
    await userStore.initAuth()
    if (userStore.hasFamily) await petStore.fetchFamilyPets()
  }

  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('openSettings') === '1') {
    const tryOpen = () => {
      if (userStore.hasFamily) {
        openSettings()
        window.history.replaceState({}, document.title, window.location.pathname)
        return true
      }
      return false
    }
    if (!tryOpen()) {
      const stop = watch(() => userStore.hasFamily, (v) => { if (v) { tryOpen(); stop() } })
    }
  }
  const joinId = urlParams.get('join')
  if (joinId) {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setTimeout(() => {
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
    window.history.replaceState({}, document.title, window.location.pathname)
  }
})

const login = () => {
  signInWithPopup(auth, provider)
    .then(() => notification.success('登入成功'))
    .catch(() => notification.error('登入失敗，請重試'))
}

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
    } else throw new Error('建立家庭失敗')
  } catch (error) {
    notification.error(error.message || '建立家庭失敗，請重試')
  } finally {
    isCreatingFamily.value = false
  }
}

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
    } else throw new Error('加入家庭失敗')
  } catch (error) {
    notification.error(error.message || '加入家庭失敗，請重試')
  } finally {
    isJoiningFamily.value = false
  }
}

const copyFamilyId = () => {
  if (!userStore.family?.id) return
  navigator.clipboard.writeText(userStore.family.id)
    .then(() => {
      isCopied.value = true
      notification.success('家庭 ID 已複製到剪貼簿')
      setTimeout(() => { isCopied.value = false }, 2000)
    })
    .catch(() => notification.error('複製失敗，請手動複製'))
}

const handleAddPet = async (petData) => {
  try {
    await petStore.addPet(petData)
    showAddPetDialog.value = false
    notification.success('毛孩新增成功！')
  } catch (error) {
    notification.error(error.message || '添加毛孩失敗，請重試')
  }
}

const editPet = (pet) => { selectedPet.value = pet; showEditPetDialog.value = true }

const handleEditPet = async (petData) => {
  try {
    const petId = petData.id
    delete petData.id
    const success = await petStore.updatePet(petId, petData)
    if (success) {
      showEditPetDialog.value = false
      selectedPet.value = null
      notification.success('毛孩更新成功！')
    } else throw new Error('更新失敗')
  } catch (error) {
    notification.error(error.message || '更新毛孩失敗，請重試')
  }
}

const deletePet = async (pet) => {
  try {
    const success = await petStore.deletePet(pet.id)
    if (success) notification.success(`已刪除寵物 ${pet.name}`)
    else throw new Error('刪除失敗')
  } catch (error) {
    notification.error(error.message || '刪除毛孩失敗，請重試')
  }
}

const selectPet = (pet) => router.push({ name: 'pet-details', params: { id: pet.id } })

const leaveFamily = async () => {
  isLeavingFamily.value = true
  try {
    const success = await userStore.leaveFamily()
    if (success) notification.success('已退出家庭')
    else throw new Error('退出家庭失敗')
  } catch (error) {
    notification.error(error.message || '退出家庭失敗，請重試')
  } finally {
    isLeavingFamily.value = false
    showLeaveConfirm.value = false
  }
}

const openSettings = () => {
  if (!userStore.family) {
    showSettingsDialog.value = true
    return
  }
  if (petStore.pets.length <= 1) {
    // Single pet: prefer pet-level value if present, else family.*
    const onlyPet = petStore.pets[0]
    const petFc = onlyPet?.foodCalories
    familySettings.wetFoodCalories =
      petFc?.wet ?? userStore.family.wetFoodCalories ?? null
    familySettings.dryFoodCalories =
      petFc?.dry ?? userStore.family.dryFoodCalories ?? null
  } else {
    // Multi-pet: load family.* into default group + build extra groups from pets
    familySettings.wetFoodCalories = userStore.family.wetFoodCalories ?? null
    familySettings.dryFoodCalories = userStore.family.dryFoodCalories ?? null
    calorieGroups.value = buildGroupsFromPets()
  }
  showSettingsDialog.value = true
}

const saveSettings = async () => {
  isSavingSettings.value = true
  try {
    if (petStore.pets.length <= 1) {
      // Single-pet path: write to family.*, clear pet-level overrides
      const ok = await userStore.updateFamilySettings({
        wetFoodCalories: familySettings.wetFoodCalories,
        dryFoodCalories: familySettings.dryFoodCalories,
      })
      if (!ok) throw new Error('更新失敗')
      const onlyPet = petStore.pets[0]
      if (onlyPet?.foodCalories) {
        await petStore.updatePet(onlyPet.id, { foodCalories: null })
      }
    } else {
      // Multi-pet path: default group → family.*, extra groups → pet.foodCalories
      const emptyGroupIdx = calorieGroups.value.findIndex((g) => g.petIds.length === 0)
      if (emptyGroupIdx !== -1) {
        notification.error(`額外設定 #${emptyGroupIdx + 1} 尚未綁定任何寵物，請綁定或刪除該設定`)
        isSavingSettings.value = false
        return
      }
      const familyOk = await userStore.updateFamilySettings({
        wetFoodCalories: familySettings.wetFoodCalories,
        dryFoodCalories: familySettings.dryFoodCalories,
      })
      if (!familyOk) throw new Error('預設設定更新失敗')
      const updates = []
      for (const pet of petStore.pets) {
        const group = calorieGroups.value.find((g) => g.petIds.includes(pet.id))
        const next = group
          ? {
              wet: group.wetFoodCalories ?? null,
              dry: group.dryFoodCalories ?? null,
            }
          : null
        const prev = pet.foodCalories ?? null
        const changed =
          (prev?.wet ?? null) !== (next?.wet ?? null) ||
          (prev?.dry ?? null) !== (next?.dry ?? null)
        if (changed) {
          updates.push(petStore.updatePet(pet.id, { foodCalories: next }))
        }
      }
      const results = await Promise.all(updates)
      if (results.some((r) => r === false)) throw new Error('部分寵物更新失敗')
    }
    notification.success('熱量設定已更新')
    showSettingsDialog.value = false
  } catch (err) {
    notification.error(err?.message || '更新設定失敗，請重試')
  } finally {
    isSavingSettings.value = false
  }
}
</script>

<style scoped>
.index-page {
  background: var(--ml-bg);
  min-height: 100vh;
}

.main-content {
  max-width: 600px;
  margin: 0 auto;
}

/* ── Family header card ── */
.family-header-card {
  background: #EC8A20;
  padding: 8px 16px 20px;
  margin-bottom: 20px;
}

.family-name {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.welcome-text {
  font-size: 13px;
  color: rgba(255,255,255,0.75);
  margin-top: 2px;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.icon-btn:hover { background: rgba(255,255,255,0.3); }

/* ── Family ID box ── */
.family-id-box {
  background: rgba(255,255,255,0.15);
  border-radius: 14px;
  padding: 12px 14px;
  margin-top: 4px;
}

.family-id-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.75);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.family-id-value {
  flex: 1;
  font-family: monospace;
  font-size: 12.5px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.04em;
}

.family-id-hint {
  font-size: 11px;
  color: rgba(255,255,255,0.65);
  margin-top: 6px;
  line-height: 1.4;
}

.copy-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255,255,255,0.22);
  color: #fff;
  border: none;
  border-radius: 9px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  font-family: inherit;
}
.copy-btn:hover { background: rgba(255,255,255,0.32); }
.copy-btn.copied { background: rgba(46,148,88,0.5); }

/* ── Login ── */
.login-hero {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: var(--ml-primary-l);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.google-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  background: #fff;
  border: 1px solid var(--ml-border);
  border-radius: 14px;
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 500;
  color: var(--ml-text);
  cursor: pointer;
  box-shadow: var(--ml-shadow);
  font-family: inherit;
  transition: box-shadow 0.15s;
}
.google-login-btn:hover { box-shadow: var(--ml-shadow-md); }

.ghost-btn {
  width: 100%;
  background: var(--ml-surface);
  border: 1.5px solid var(--ml-border);
  border-radius: 14px;
  padding: 14px 20px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ml-text-sec);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}
.ghost-btn:hover { background: var(--ml-bg); }

/* ── Dialog ── */
.ml-dialog {
  border-radius: 20px !important;
  overflow: hidden;
  width: 100%;
  max-width: 440px;
}

.ml-dialog--scrollable {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.ml-dialog--scrollable .dialog-header,
.ml-dialog--scrollable .dialog-actions {
  flex-shrink: 0;
}
.ml-dialog--scrollable .dialog-body {
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}
.dialog-actions {
  border-top: 1px solid var(--ml-border);
  padding: 12px 16px;
}

.dialog-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--ml-border);
  padding: 16px 20px;
}

.settings-section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ml-text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.cal-group {
  border: 1px solid var(--ml-border);
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--ml-surface);
}
.cal-group--default {
  border-color: var(--ml-primary);
  background: var(--ml-primary-l, rgba(236,138,32,0.06));
}
.cal-group__badge {
  font-size: 11px;
  font-weight: 600;
  color: var(--ml-primary);
  background: rgba(236,138,32,0.15);
  border-radius: 6px;
  padding: 2px 8px;
}
.cal-group__pets {
  font-size: 12px;
  color: var(--ml-text-sec);
  margin-top: 4px;
  line-height: 1.4;
}
.cal-extra-divider {
  font-size: 12px;
  font-weight: 600;
  color: var(--ml-text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin: 16px 0 10px;
}
.cal-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.cal-group__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ml-text);
}
.cal-group__remove {
  background: transparent;
  border: none;
  color: #d33;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.cal-group__remove:hover { background: rgba(211,51,51,0.08); }
.cal-group__add {
  width: 100%;
  background: transparent;
  border: 1.5px dashed var(--ml-border);
  border-radius: 12px;
  padding: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ml-text-sec);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, border-color 0.15s;
}
.cal-group__add:hover {
  background: var(--ml-bg);
  border-color: var(--ml-primary);
  color: var(--ml-primary);
}
.cal-unbound-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ml-text-sec);
  background: var(--ml-primary-l, rgba(236,138,32,0.08));
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 12px;
  line-height: 1.4;
}
</style>
