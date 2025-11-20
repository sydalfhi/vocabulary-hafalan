export const speak = (text: string, lang: "en" | "id") => {
  if ("speechSynthesis" in window) {
    // Cancel previous speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "en" ? "en-US" : "id-ID";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    // Pilih voice yang bagus (opsional)
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((v) =>
      lang === "en"
        ? (v.lang.startsWith("en") && v.name.includes("Google")) ||
          v.name.includes("Natural")
        : v.lang === "id-ID"
    );
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  }
};
