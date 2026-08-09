/**
 * RetrievalOps Jira Example - Main Entry Point
 *
 * Exports entity definition and search/index functions for use in other modules.
 */

export { jiraTicket, SAMPLE_TICKETS } from './entity';
export type { JiraTicketDocument } from './entity';

export { indexTickets } from './index-tickets';
export { searchTickets } from './search-tickets';
