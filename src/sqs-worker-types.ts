import {Task} from "./task";
import {Message} from "@aws-sdk/client-sqs";


export interface ISqsSubmitterConfig extends ISqsCommon {
  tasks: Array<ITaskClass>;
  log?: (msg: string) => void;
  onMessageSent?: (message: any) => Promise<any>;
}

export interface ISqsWorkerConfig extends ISqsWorkerCommon {
  concurrency: number;
}

export interface ISqsConsumerConfig extends ISqsWorkerCommon {
  id: string;
  visibilityTimeout?: number;
}

interface ISqsWorkerCommon extends ISqsCommon {
  tasks: Array<ITaskClass>;
  verbose?: boolean;
  successCallback?: SqsWorkerSuccessfulTaskCallback;
  failCallback?: SqsWorkerFailedTaskCallback;
  log?: (msg: string) => void;
}

interface ISqsCommon {
  sqsUrl: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;

}

export interface ISqsWorkerTaskResult {
  durationMs: number;
  taskResult: any;
}

export interface ITaskClass {
  name: string;
  workerConfig: ISqsSubmitterConfig;
  new (): Task;
}

export interface ITaskResult {
  info?: string;
  error?: any;
}


export type SqsWorkerFailedTaskCallback = (taskName: string, error: any) => void;

export type SqsWorkerSuccessfulTaskCallback = (task: Task, result: ISqsWorkerTaskResult) => void;
