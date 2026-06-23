// Generates a mock Google Meet link
function generateMockMeetLink(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const gen = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `https://meet.google.com/${gen(3)}-${gen(4)}-${gen(3)}`;
}

export async function generateGoogleMeetLink(options?: {
  titulo?: string;
  dataHoraInicio?: Date;
  dataHoraFim?: Date;
}): Promise<string> {
  // Option with Google API can be implemented here if credentials are set.
  const hasGoogleCreds =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (hasGoogleCreds) {
    // If real credentials are provided in the future, we could call calendar APIs.
    // For now, we fall back to a mock generator as per KUS-92 requirement 2.
  }

  return generateMockMeetLink();
}
