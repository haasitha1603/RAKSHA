import { get, set, del } from 'idb-keyval';
import { PositionBatchItem } from '@raksha/shared';

const OFFLINE_QUEUE_KEY = 'raksha_offline_positions_queue';

export async function enqueueOfflinePositions(positions: PositionBatchItem[]): Promise<void> {
  const existing: PositionBatchItem[] = (await get(OFFLINE_QUEUE_KEY)) || [];
  existing.push(...positions);
  await set(OFFLINE_QUEUE_KEY, existing);
}

export async function getOfflinePositions(): Promise<PositionBatchItem[]> {
  return (await get(OFFLINE_QUEUE_KEY)) || [];
}

export async function clearOfflinePositions(): Promise<void> {
  await del(OFFLINE_QUEUE_KEY);
}

export async function saveAudioRecording(id: string, blob: Blob): Promise<void> {
  await set(`audio_record_${id}`, blob);
}

export async function getAudioRecording(id: string): Promise<Blob | undefined> {
  return await get(`audio_record_${id}`);
}
