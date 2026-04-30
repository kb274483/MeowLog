// Mapping between PetDailyRecord 標籤 (Chinese) and reminder type used by Cloud Functions.
// All daily-record tags can trigger a reminder prompt.
export const REMINDER_TAGS = ['回診', '疫苗', '驅蟲', '洗澡', '美容', '其他']

export const TAG_TO_TYPE = {
  回診: 'vet',
  疫苗: 'vaccine',
  驅蟲: 'deworm',
  洗澡: 'bath',
  美容: 'grooming',
  其他: 'other',
}

export const TYPE_TO_TAG = {
  vet: '回診',
  vaccine: '疫苗',
  deworm: '驅蟲',
  bath: '洗澡',
  grooming: '美容',
  other: '其他',
}

export const TYPE_LABELS = {
  vet: '看診',
  vaccine: '疫苗',
  deworm: '驅蟲',
  bath: '洗澡',
  grooming: '美容',
  other: '提醒',
}

export const isReminderTag = (tag) => REMINDER_TAGS.includes(tag)
