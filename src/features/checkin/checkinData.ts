import { db } from '@/lib/db/db';
import { createId } from '@/lib/utils/id';
import { localDate, type Checkin } from './types';

export async function saveCheckin(c: Omit<Checkin, 'id' | 'date' | 'createdAt'>): Promise<Checkin> {
  const now = Date.now();
  const record: Checkin = { ...c, id: createId(), date: localDate(now), createdAt: now };
  await db.checkins.add(record);
  return record;
}

export async function deleteCheckin(id: string): Promise<void> {
  await db.checkins.delete(id);
}

/** 何日続けてチェックインしているか（今日まだなら、昨日までで数える） */
export function streakDays(dates: string[], today = localDate(Date.now())): number {
  const set = new Set(dates);
  const d = new Date(`${today}T12:00:00`);
  if (!set.has(today)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(localDate(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
