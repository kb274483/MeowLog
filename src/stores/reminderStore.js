import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createReminder,
  updateReminder,
  disableReminder,
  completeReminder,
  deleteReminder,
  fetchFamilyReminders,
  fetchPetReminders,
} from 'src/services/reminderService'
import { useUserStore } from './userStore'

export const useReminderStore = defineStore('reminder', () => {
  const reminders = ref([])
  const loading = ref(false)

  const userStore = useUserStore()

  const _replaceById = (id, patch) => {
    const idx = reminders.value.findIndex((r) => r.id === id)
    if (idx !== -1) {
      reminders.value[idx] = { ...reminders.value[idx], ...patch }
    }
  }

  const _removeById = (id) => {
    reminders.value = reminders.value.filter((r) => r.id !== id)
  }

  /**
   * Load all reminders for the current family.
   */
  const loadFamilyReminders = async () => {
    if (!userStore.hasFamily) return []

    loading.value = true
    try {
      const list = await fetchFamilyReminders(userStore.family.id)
      reminders.value = list
      return list
    } catch (error) {
      console.error('Failed to load family reminders:', error)
      return reminders.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Load reminders for a specific pet, merging into the local list.
   */
  const loadPetReminders = async (petId) => {
    if (!userStore.hasFamily) return []

    loading.value = true
    try {
      const list = await fetchPetReminders(userStore.family.id, petId)

      // Replace any existing entries for this pet, then append new ones.
      const withoutPet = reminders.value.filter((r) => r.petId !== petId)
      reminders.value = [...withoutPet, ...list]

      return list
    } catch (error) {
      console.error('Failed to load pet reminders:', error)
      return reminders.value.filter((r) => r.petId === petId)
    } finally {
      loading.value = false
    }
  }

  /**
   * Create a reminder and add it to the local list.
   */
  const addReminder = async (data) => {
    if (!userStore.hasFamily || !userStore.isLoggedIn) {
      throw new Error('Must be logged in with a family to create reminders')
    }

    try {
      const created = await createReminder(userStore.family.id, userStore.user.uid, data)
      reminders.value = [...reminders.value, created].sort((a, b) =>
        a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0,
      )
      return created
    } catch (error) {
      console.error('Failed to create reminder:', error)
      throw error
    }
  }

  /**
   * Update a reminder's fields and sync local state.
   */
  const editReminder = async (reminderId, data) => {
    try {
      const patch = await updateReminder(reminderId, data)
      _replaceById(reminderId, patch)
      return true
    } catch (error) {
      console.error('Failed to update reminder:', error)
      return false
    }
  }

  /**
   * Disable a reminder (soft off, still visible).
   */
  const turnOffReminder = async (reminderId) => {
    try {
      await disableReminder(reminderId)
      _replaceById(reminderId, { enabled: false, updatedAt: new Date() })
      return true
    } catch (error) {
      console.error('Failed to disable reminder:', error)
      return false
    }
  }

  /**
   * Mark a reminder as completed.
   */
  const markComplete = async (reminderId) => {
    try {
      await completeReminder(reminderId)
      _replaceById(reminderId, { completedAt: new Date(), enabled: false, updatedAt: new Date() })
      return true
    } catch (error) {
      console.error('Failed to complete reminder:', error)
      return false
    }
  }

  /**
   * Permanently delete a reminder.
   */
  const removeReminder = async (reminderId) => {
    try {
      await deleteReminder(reminderId)
      _removeById(reminderId)
      return true
    } catch (error) {
      console.error('Failed to delete reminder:', error)
      return false
    }
  }

  /**
   * Find reminders that were auto-created from a given daily record.
   */
  const findBySourceRecordId = (sourceRecordId) =>
    reminders.value.filter((r) => r.sourceRecordId === sourceRecordId)

  return {
    reminders,
    loading,
    loadFamilyReminders,
    loadPetReminders,
    addReminder,
    editReminder,
    turnOffReminder,
    markComplete,
    removeReminder,
    findBySourceRecordId,
  }
})
