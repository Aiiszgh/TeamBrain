import { Memory, MemoryEvent } from '../models/index.js';

let intervalTimer: NodeJS.Timeout | null = null;

export function startExpirySweeper(intervalMs = 60000): void {
  if (intervalTimer) return;

  intervalTimer = setInterval(async () => {
    try {
      const now = new Date();
      // Find memories that have expired but haven't had an expired event recorded
      const expiredMemories = await Memory.find({
        expiresAt: { $lte: now },
      }).limit(50);

      for (const mem of expiredMemories) {
        const existingEvent = await MemoryEvent.findOne({
          memoryId: mem._id,
          eventType: 'expired',
        });

        if (!existingEvent) {
          await MemoryEvent.create({
            memoryId: mem._id,
            eventType: 'expired',
            metadata: {
              expiredAt: mem.expiresAt,
              contentSnippet: mem.content.slice(0, 50),
            },
          });
        }
      }
    } catch (err) {
      console.warn('Expiry sweeper cycle error:', err);
    }
  }, intervalMs);
}

export function stopExpirySweeper(): void {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}
