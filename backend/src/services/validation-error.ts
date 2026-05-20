export class ValidationFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationFailure";
  }
}
