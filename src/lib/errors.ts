/** Uygulama genelinde kullanılan, HTTP durumu taşıyan hata tipi. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
