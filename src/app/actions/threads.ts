'use server'

/**
 * @deprecated Thread actions are deferred in the VRM simplification.
 * Email automation will be re-added in a future iteration.
 *
 * For now, use the entity-based status updates in entities.ts:
 *   - updateEventEntityStatus() for status changes
 *   - Outreach will be handled by direct integration when needed
 */

import { updateEventEntityStatus } from './entities'

// Stub implementations that log warnings

export async function startOutreach(_vendorId: string) {
  console.warn('[DEPRECATED] startOutreach is deferred. Email automation will be added later.')
  return { success: false, message: 'Outreach automation is not yet implemented in the new schema' }
}

export async function escalateThread(_threadId: string, _humanResponse: string) {
  console.warn('[DEPRECATED] escalateThread is deferred. Thread management will be added later.')
  return { success: false, message: 'Thread escalation is not yet implemented in the new schema' }
}

export async function updateThreadStatus(_threadId: string, _status: string) {
  console.warn('[DEPRECATED] updateThreadStatus is deferred. Use updateEventEntityStatus instead.')
  return { success: false, message: 'Use updateEventEntityStatus from entities.ts instead' }
}

export async function bulkStartOutreach(_eventId: string) {
  console.warn('[DEPRECATED] bulkStartOutreach is deferred. Email automation will be added later.')
  return { success: false, count: 0, message: 'Outreach automation is not yet implemented' }
}

export const startOutreachForEvent = bulkStartOutreach

export async function startOutreachByCategory(_eventId: string, _category: string) {
  console.warn('[DEPRECATED] startOutreachByCategory is deferred.')
  return { success: false, count: 0, message: 'Outreach automation is not yet implemented' }
}

export async function approveOutreach(_vendorId: string) {
  console.warn('[DEPRECATED] approveOutreach is deferred.')
  return { success: false, message: 'Approval workflow is not yet implemented in the new schema' }
}

export async function bulkApproveOutreach(_vendorIds: string[]) {
  console.warn('[DEPRECATED] bulkApproveOutreach is deferred.')
  return { success: false, count: 0, message: 'Approval workflow is not yet implemented' }
}

export async function getPendingApprovalVendors(_eventId: string) {
  console.warn('[DEPRECATED] getPendingApprovalVendors is deferred.')
  return []
}
