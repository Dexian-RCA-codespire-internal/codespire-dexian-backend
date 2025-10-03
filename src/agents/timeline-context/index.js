/**
 * Timeline Context Agent - Main Export
 * Exports the service for timeline context generation
 */

const service = require('./service');
const agent = require('./timeline-context-agent');
const config = require('./config');

module.exports = {
    service,
    agent,
    config
};
