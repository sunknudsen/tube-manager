export interface EnvironmentVariables {
    [key: string]: string;
}
export declare const updateDotEnv: (variables: EnvironmentVariables) => Promise<void>;
