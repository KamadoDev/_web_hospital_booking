export type GenerateReplyInput = {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
};

export type AIAdapter = {
  generateReply(input: GenerateReplyInput): Promise<string>;
};
