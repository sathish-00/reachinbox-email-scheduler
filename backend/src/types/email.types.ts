export interface EmailRecipient {
  email: string;
}

export interface ScheduleEmailInput {
  senderId: string;
  subject: string;
  body: string;
  recipients: EmailRecipient[];
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
}

export interface EmailJobData {
  jobId: string;
  batchId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
}