import dotenv from "dotenv";
export interface EnvironmentVariables {
    [key: string]: string;
}
export declare const loadConfig: (path: string) => Promise<dotenv.DotenvConfigOutput>;
export declare const updateConfig: (variables: EnvironmentVariables) => Promise<void>;
