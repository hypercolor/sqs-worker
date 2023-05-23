import {ISqsSubmitterConfig, ITaskResult} from "./sqs-worker-types";
import {SQS} from "@aws-sdk/client-sqs";
import {Mapper} from "./mapper";
import {container} from 'tsyringe';

export abstract class Task {
    public static workerConfig: ISqsSubmitterConfig;

    public abstract run(): Promise<ITaskResult | void>;

    public static build<T = Task>(
        this: new () => T,
        parameters?: { [key in keyof T]?: any }
    ) {
        return Mapper.mapInput(parameters || {}, this);
    }

    public static buildWithDi<T = Task>(this: new() => T, parameters?: { [key in keyof T]?: any }) {
        const instance: any = container.resolve(this);
        Object.assign(instance, parameters);
        return instance as T;
    }

    public async submit(delaySeconds?: number) {
        const config: ISqsSubmitterConfig = (this.constructor as any)
            .workerConfig;
        if (!config) {
            return Promise.reject(
                new Error(
                    "Worker config not set for task " +
                        this.constructor.name +
                        ", was it registered with a SqsWorkerSubmitter?"
                )
            );
        } else {
            const params = {
                type: this.constructor.name,
                parameters: this,
            };


            if (Task.workerConfig.onMessageSent) {
                (params as any).meta = await Task.workerConfig.onMessageSent(params);
            }

            // (params as any).messageId = record._id;

            return new SQS({
                // credentials,
                // region,
            })
                .sendMessage({
                    DelaySeconds: delaySeconds || 0,
                    MessageAttributes: {
                        type: {
                            DataType: "String",
                            StringValue: this.constructor.name,
                        },
                    },
                    MessageBody: JSON.stringify(params),
                    QueueUrl: config.sqsUrl,
                });
        }
    }
}
