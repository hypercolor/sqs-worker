import * as https from 'https';
import {Consumer} from 'sqs-consumer';
import {ISqsConsumerConfig} from './sqs-worker-types';
import {TaskFactory} from './task-factory';
import {TaskExecutor} from "./task-executor";
import {SQS} from "@aws-sdk/client-sqs";
const MD5 = require('md5');

export class SqsWorkerConsumer {

  private consumer: Consumer;
  private executor: TaskExecutor;

  private log = (message: string) => {}

  constructor(public config: ISqsConsumerConfig) {

    this.log = config.log || this.log;

    const sqs = new SQS({
      region: 'us-east-1',
      // httpOptions: {
      //   agent: new https.Agent({
      //     keepAlive: true
      //   })
      // }
    });

    this.executor = new TaskExecutor(config);

    this.consumer = Consumer.create({
      queueUrl: config.sqsUrl,
      handleMessage: this.executor.handler,
      pollingWaitTimeMs: 1000,
      sqs,
      messageAttributeNames: ['type'],
      // terminateVisibilityTimeout: true,  // if task fails, allow it to be immediately retried instead of waiting to end of visibility timeout
      visibilityTimeout: config.visibilityTimeout,
      heartbeatInterval: 15, // sqs default timeout is 30 sec, so refresh lock on message every 15 sec
      handleMessageTimeout: 2 * 3600 * 1000 // sqs global timeout
    });

    this.consumer.on('error', err => {
      if (!this.config || this.config.verbose) {
        console.error('SqsWorkerConsumer: There was an error in the sqs task');
        console.error(err);
        console.error(err.stack);
      }
    });
    this.consumer.on('processing_error', err => {
      if (!this.config || this.config.verbose) {
        console.error('SqsWorkerConsumer: There was a processing_error in the sqs task');
        console.error(err);
        console.error(err.stack);
      }
    });
  }

  public async start() {
    return this.consumer.start();
  }



}
