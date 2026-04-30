// Mapping between PetDailyRecord 標籤 (Chinese) and reminder type used by Cloud Functions.
// Daily record tags that should trigger a reminder prompt:
export const REMINDER_TAGS = ['回診', '疫苗', '驅蟲']

export const TAG_TO_TYPE = {
  回診: 'vet',
  疫苗: 'vaccine',
  驅蟲: 'deworm',
}

export const TYPE_TO_TAG = {
  vet: '回診',
  vaccine: '疫苗',
  deworm: '驅蟲',
}

export const TYPE_LABELS = {
  vet: '看診',
  vaccine: '疫苗',
  deworm: '驅蟲',
}

export const isReminderTag = (tag) => REMINDER_TAGS.includes(tag)
