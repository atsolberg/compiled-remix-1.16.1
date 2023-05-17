import type { Location } from "react-router-dom";
export interface Submission {
    action: string;
    method: string;
    formData: FormData;
    encType: string;
    key: string;
}
export interface ActionSubmission extends Submission {
    method: "POST" | "PUT" | "PATCH" | "DELETE";
}
export interface LoaderSubmission extends Submission {
    method: "GET";
}
export type TransitionStates = {
    Idle: {
        state: "idle";
        type: "idle";
        submission: undefined;
        location: undefined;
    };
    SubmittingAction: {
        state: "submitting";
        type: "actionSubmission";
        submission: ActionSubmission;
        location: Location;
    };
    SubmittingLoader: {
        state: "submitting";
        type: "loaderSubmission";
        submission: LoaderSubmission;
        location: Location;
    };
    LoadingLoaderSubmissionRedirect: {
        state: "loading";
        type: "loaderSubmissionRedirect";
        submission: LoaderSubmission;
        location: Location;
    };
    LoadingAction: {
        state: "loading";
        type: "actionReload";
        submission: ActionSubmission;
        location: Location;
    };
    LoadingActionRedirect: {
        state: "loading";
        type: "actionRedirect";
        submission: ActionSubmission;
        location: Location;
    };
    LoadingFetchActionRedirect: {
        state: "loading";
        type: "fetchActionRedirect";
        submission: undefined;
        location: Location;
    };
    LoadingRedirect: {
        state: "loading";
        type: "normalRedirect";
        submission: undefined;
        location: Location;
    };
    Loading: {
        state: "loading";
        type: "normalLoad";
        location: Location;
        submission: undefined;
    };
};
export type Transition = TransitionStates[keyof TransitionStates];
export type FetcherStates<TData = any> = {
    Idle: {
        state: "idle";
        type: "init";
        formMethod: undefined;
        formAction: undefined;
        formData: undefined;
        formEncType: undefined;
        submission: undefined;
        data: undefined;
    };
    SubmittingAction: {
        state: "submitting";
        type: "actionSubmission";
        formMethod: ActionSubmission["method"];
        formAction: string;
        formData: FormData;
        formEncType: string;
        submission: ActionSubmission;
        data: TData | undefined;
    };
    SubmittingLoader: {
        state: "submitting";
        type: "loaderSubmission";
        formMethod: LoaderSubmission["method"];
        formAction: string;
        formData: FormData;
        formEncType: string;
        submission: LoaderSubmission;
        data: TData | undefined;
    };
    ReloadingAction: {
        state: "loading";
        type: "actionReload";
        formMethod: ActionSubmission["method"];
        formAction: string;
        formData: FormData;
        formEncType: string;
        submission: ActionSubmission;
        data: TData;
    };
    LoadingActionRedirect: {
        state: "loading";
        type: "actionRedirect";
        formMethod: ActionSubmission["method"];
        formAction: string;
        formData: FormData;
        formEncType: string;
        submission: ActionSubmission;
        data: undefined;
    };
    Loading: {
        state: "loading";
        type: "normalLoad";
        formMethod: undefined;
        formAction: undefined;
        formData: undefined;
        formEncType: undefined;
        submission: undefined;
        data: TData | undefined;
    };
    Done: {
        state: "idle";
        type: "done";
        formMethod: undefined;
        formAction: undefined;
        formData: undefined;
        formEncType: undefined;
        submission: undefined;
        data: TData;
    };
};
export type Fetcher<TData = any> = FetcherStates<TData>[keyof FetcherStates<TData>];
export declare const IDLE_TRANSITION: TransitionStates["Idle"];
export declare const IDLE_FETCHER: FetcherStates["Idle"];
