import { monitorJobs } from './src/monitorJobs.js';

try {
    await monitorJobs();
} catch (error) {
    console.error(error);
}