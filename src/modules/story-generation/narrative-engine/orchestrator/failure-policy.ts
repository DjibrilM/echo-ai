export interface FailurePolicyConfig {
  maxBlueprintSubmissions: number;
  maxSceneRevisions: number;
  maxInferenceRetries: number;
}

export const DEFAULT_FAILURE_POLICY: FailurePolicyConfig = {
  maxBlueprintSubmissions: 2,
  maxSceneRevisions: 2,
  maxInferenceRetries: 2,
};

export class FailurePolicy {
  private readonly config: FailurePolicyConfig;

  constructor(config: FailurePolicyConfig = DEFAULT_FAILURE_POLICY) {
    this.config = config;
  }

  public canRetryBlueprint(currentSubmissionCount: number): boolean {
    return currentSubmissionCount < this.config.maxBlueprintSubmissions;
  }

  public canReviseScene(currentRetryCount: number): boolean {
    return currentRetryCount < this.config.maxSceneRevisions;
  }
}
