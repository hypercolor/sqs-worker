import { TypedJSON } from "typedjson";


export type IMappedClass<T> = new (...args: Array<any>) => T;

export class Mapper {
    public static mapInput<T>(json: any, clazz: IMappedClass<T>): T {
        return this.map(json, clazz);
    }

    public static mapOutput<T>(json: any, clazz: IMappedClass<T>): T {
        return this.map(json, clazz);
    }

    public static mapInputArray<T>(
        json: any,
        clazz: IMappedClass<T>
    ): Array<T> {
        return this.mapArray(json, clazz);
    }

    public static mapOutputArray<T>(
        json: any,
        clazz: IMappedClass<T>
    ): Array<T> {
        return this.mapArray(json, clazz);
    }

    private static map<T>(
        json: any,
        clazz: IMappedClass<T>
    ): T {
        if (!json) {
            throw new Error("Failed to map null or undefined object");
        }
        const serializer = new TypedJSON(clazz as any, {
            errorHandler: (err: Error) => {
                throw err;
            },
        });
        try {
            if (json.toJSON) {
                // console.log('toJSON function found, calling it');
                json = json.toJSON();
            }
            // console.log('Mapping to ' + clazz + ': ' + JSON.stringify(json, null, 2));
            return serializer.parse(json) as T;
        } catch (err: any) {
            throw new Error(
                "Failed to map: " + err.toLocaleString()
            );
        }
    }

    private static mapArray<T>(
        json: any,
        clazz: IMappedClass<T>
    ): Array<T> {
        if (!json) {
            throw new Error("Failed to map null or undefined array");
        }
        if (json.constructor !== Array) {
            throw new Error(
                "Expected array, found " + json.constructor.name
            );
        }
        const serializer = new TypedJSON(clazz as any, {
            errorHandler: (err: Error) => {
                throw err;
            },
        });
        try {
            return json.map((item: any) => serializer.parse(item) as T);
        } catch (err: any) {
            throw new Error(
                "Failed to map: " + err.toLocaleString()
            );
        }
    }
}
