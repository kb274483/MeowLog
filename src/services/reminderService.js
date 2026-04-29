import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'src/boot/firebase'

const COLLECTION = 'reminders'

/**
 * Create a new reminder scoped to a family.
 */
export const createReminder = async (familyId, userId, data) => {
  const payload = {
    familyId,
    petId: data.petId || null,
    type: data.type,
    title: data.title,
    note: data.note || '',
    dueDate: data.dueDate,
    timezone: data.timezone || 'Asia/Taipei',
    offsets: data.offsets ?? [-1, 0],
    enabled: true,
    completedAt: null,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, COLLECTION), payload)

  return {
    id: docRef.id,
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Update mutable fields of an existing reminder.
 */
export const updateReminder = async (reminderId, data) => {
  const allowed = ['petId', 'type', 'title', 'note', 'dueDate', 'timezone', 'offsets', 'enabled']
  const patch = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      patch[key] = data[key]
    }
  }
  patch.updatedAt = serverTimestamp()

  await updateDoc(doc(db, COLLECTION, reminderId), patch)
  return { ...patch, updatedAt: new Date() }
}

/**
 * Disable a reminder without deleting it.
 */
export const disableReminder = async (reminderId) => {
  await updateDoc(doc(db, COLLECTION, reminderId), {
    enabled: false,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Mark a reminder as completed.
 */
export const completeReminder = async (reminderId) => {
  await updateDoc(doc(db, COLLECTION, reminderId), {
    completedAt: serverTimestamp(),
    enabled: false,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Permanently delete a reminder.
 */
export const deleteReminder = async (reminderId) => {
  await deleteDoc(doc(db, COLLECTION, reminderId))
}

/**
 * Fetch all reminders for a family, ordered by dueDate ascending.
 */
export const fetchFamilyReminders = async (familyId) => {
  const q = query(
    collection(db, COLLECTION),
    where('familyId', '==', familyId),
    orderBy('dueDate', 'asc'),
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Fetch reminders for a specific pet within a family.
 */
export const fetchPetReminders = async (familyId, petId) => {
  const q = query(
    collection(db, COLLECTION),
    where('familyId', '==', familyId),
    where('petId', '==', petId),
    orderBy('dueDate', 'asc'),
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}
