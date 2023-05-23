import {ITaskClass} from "./sqs-worker-types";
import {Task} from "./task";
import {Mapper} from "./mapper";

export class TaskFactory {
    private static taskTypes: { [key: string]: ITaskClass } = {};

    public static registerTask(taskType: ITaskClass) {
        this.taskTypes[taskType.name] = taskType;
    }

    public static async build(
        type: string,
        parameters?: { [key: string]: any }
    ): Promise<Task> {
        type = type.trim();
        const taskType = this.taskTypes[type];
        if (!taskType) {
            throw new Error("Invalid task type: " + type);
        }
        return Mapper.mapInput(parameters || {}, taskType);
    }
}
