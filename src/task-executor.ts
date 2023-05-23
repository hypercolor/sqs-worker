import {Message} from "@aws-sdk/client-sqs";
import MD5 from "md5";
import {TaskFactory} from "./task-factory";
import {Stream} from "stream";
import {ITaskClass} from "./sqs-worker-types";

export enum TaskExecutorEvents {
    LOG = 'log',
    MESSAGE_RECEIVED = 'message_received',
    INVALID_MESSAGE = 'invalid_message',
    TASK_ERROR = 'task_error',
    TASK_COMPLETE = 'task_complete',
}

export interface ITaskExecutorConfig {
    id: string
    verbose?: boolean
    sqsUrl: string
    tasks: Array<ITaskClass>
}

export class TaskExecutor extends Stream {

    constructor(private config: ITaskExecutorConfig) {
        config.tasks.forEach(task => {
            TaskFactory.registerTask(task);
        })
        super();
    }

    private log(message: string) {
        if (this.config.verbose) {
            this.emit(TaskExecutorEvents.LOG, this.config.id + ": " + message);
        }
    }

    public async handler(message: Message) {

        // return async (message: Message) => {
            const start = new Date();
            if (!message.Body) {
                this.log(
                    "Invalid message, no body: " + JSON.stringify(message)
                );
                return;
            }
            const md5OfBody = MD5(message.Body);
            if (md5OfBody !== message.MD5OfBody) {
                this.log(
                    "Invalid message, md5 mismatch: " +
                    md5OfBody +
                    " != " +
                    message.MD5OfBody +
                    ", body was: " +
                    message.Body
                );
                return;
            }
            const body = JSON.parse(message.Body);
            if (!body.type || typeof body.type !== "string") {
                this.log(
                    "Invalid message, message type not found or recognized: " +
                    JSON.stringify(message)
                );
                return;
            }
            this.emit(TaskExecutorEvents.MESSAGE_RECEIVED, body);
            const task = await this.parseTask(body);
            if (!task) {
                this.log("Failed to parse task, exiting");
                return;
            }
            try {
                const receiveCount = parseInt(
                    message.Attributes?.ApproximateReceiveCount || "1"
                );
                const firstSent = new Date(
                    parseInt(
                        message.Attributes?.SentTimestamp ||
                        new Date().getTime().toString()
                    )
                );

                this.log("Starting task from message: " + message.Body);

                if (!isNaN(receiveCount) && receiveCount > 1) {
                    const elapsedSeconds =
                        (new Date().getTime() - firstSent.getTime()) / 1000;
                    this.log(
                        "This message has now been received " +
                        receiveCount +
                        " times, it was first sent " +
                        elapsedSeconds +
                        " seconds ago."
                    );
                    this.log("Full message: " + JSON.stringify(message));
                }

                const result = await task.run();

                // const result = await task.run();
                if (result && result.error) {
                    this.emit(TaskExecutorEvents.TASK_ERROR, result.error, body, new Date().getTime() - start.getTime());
                    this.log(
                        `Job ${TaskExecutor.parseMessageType(message)} [${
                            message.MessageId
                        }] failed (not retryable): ${result.error}`
                    );
                    // this.config.failCallback &&
                    // this.config.failCallback(
                    //     TaskExecutor.parseMessageType(message),
                    //     result.error
                    // );
                } else {
                    this.emit(TaskExecutorEvents.TASK_COMPLETE, body, new Date().getTime() - start.getTime());
                    this.log(
                        `${task.constructor.name} [${
                            message.MessageId
                        }] complete in ${TaskExecutor.getDuration(start)}${
                            result && result.info ? ": " + result.info : ""
                        }`
                    );
                    // this.config.successCallback &&
                    // this.config.successCallback(task, {
                    //     durationMs: new Date().getTime() - start.getTime(),
                    //     taskResult: result,
                    // });
                }
            } catch (err) {
                this.emit(TaskExecutorEvents.TASK_ERROR, err, body, new Date().getTime() - start.getTime());
                this.log(
                    `Job ${TaskExecutor.parseMessageType(message)} [${
                        message.MessageId
                    }] failed (retryable): ${err}`
                );
                // this.config.failCallback &&
                // this.config.failCallback(
                //     TaskExecutor.parseMessageType(message),
                //     err
                // );
                throw err;
            }
        // };

    }



    private async parseTask(body: any) {
        return TaskFactory.build(body.type, body.parameters).catch((err) => {
            this.emit(TaskExecutorEvents.INVALID_MESSAGE, body);
            this.log(
                `Failed to construct task for type ${
                    body.type
                } with params: ${JSON.stringify(body.parameters)} error: ${err}`
            );
            return undefined;
        });
    }

    private static parseMessageType(message: Message) {
        return message.MessageAttributes &&
        message.MessageAttributes.type.StringValue
            ? message.MessageAttributes.type.StringValue
            : "unknown";
    }

    private static getDuration(start: Date) {
        const duration = new Date().getTime() - start.getTime();
        if (duration < 1000) {
            return `${duration} ms`;
        } else if (duration < 60 * 1000) {
            return `${(duration / 1000).toFixed(2)} sec`;
        } else if (duration < 3600 * 1000) {
            return `${(duration / 1000 / 60).toFixed(2)} min`;
        } else {
            return `${(duration / 1000 / 3600).toFixed(2)} hrs`;
        }
    }
}
