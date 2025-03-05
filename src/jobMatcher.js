export const isTargetJob = (jobTitle, targetJobs) => {
    return targetJobs.some(targetJob => 
        jobTitle.toLowerCase().includes(targetJob.toLowerCase())
    );
};