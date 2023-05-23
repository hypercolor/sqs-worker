import {SqsWorkerConsumer} from './sqs-worker-consumer';
import {ISqsSubmitterConfig, ISqsWorkerConfig} from './sqs-worker-types';
import { TaskFactory } from './task-factory';


export class SqsWorker {

  private consumers: Array<SqsWorkerConsumer> = [];

  public static initSubmitter(config: ISqsSubmitterConfig) {
    config.tasks.forEach(taskType => {
      taskType.workerConfig = config;
    });
  }

  private log = (message: string) => {}

  constructor(public config: ISqsWorkerConfig) {
    this.log = config.log || this.log;

    config.tasks.forEach(taskType => {
      if (this.config.verbose) {
        this.log('registering task for consuming: ' + taskType.name)
      }
      taskType.workerConfig = this.config;
      TaskFactory.registerTask(taskType);
    });

    for (var ii=0; ii<config.concurrency; ii+=1) {
      this.consumers.push(new SqsWorkerConsumer({
        ...this.config,
        id: `w${ii}`
      }));
    }

  }

  public async start() {
    await Promise.all(this.consumers.map(consumer => consumer.start()));
    if (this.config.verbose) {
      this.log('Worker started with concurrency: ' + this.consumers.length);
    }
  }


}
