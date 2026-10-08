import { ref } from 'vue'
import { storage } from '../storage'
import { uid } from '../utils/id'

export interface FlashNote {
  id: string
  text: string
  createdAt: number
}

const NOTES_KEY = 'notes'

/** 新的在最前 */
export const notes = ref<FlashNote[]>([])

export async function initNotes(): Promise<void> {
  const raw = await storage.readLocal<FlashNote[]>(NOTES_KEY)
  notes.value = Array.isArray(raw) ? raw : []
}

async function persist(): Promise<void> {
  await storage.writeLocal(NOTES_KEY, notes.value)
}

/** 记一条念念不忘：空内容不记，保存后插到最前 */
export async function addNote(text: string): Promise<void> {
  const clean = text.trim()
  if (!clean) return
  notes.value.unshift({ id: uid('n'), text: clean, createdAt: Date.now() })
  await persist()
}

export async function removeNote(id: string): Promise<void> {
  const index = notes.value.findIndex((item) => item.id === id)
  if (index < 0) return
  notes.value.splice(index, 1)
  await persist()
}
