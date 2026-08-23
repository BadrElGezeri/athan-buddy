# Reciter nationality data

Athan Buddy keeps a small, reviewed mapping from MP3Quran reciter IDs to ISO country codes. The app does not infer nationality from a name, residence, accent, audio-server location, or recitation style. If an identity is ambiguous or no reliable source was found, the interface shows no flag.

The main mapping is cross-checked against the pinned [Quran Lab reciter metadata](https://huggingface.co/datasets/quranlab/quran-audio/blob/1e4bb64d1e7374b36acab1f944bb046facd0c98c/metadata/reciters.csv), which includes source provenance and explicit nationality for 38 matching MP3Quran reciters.

Additional exact MP3Quran identities were reviewed against these public biographies:

- Al-Zain Mohammad Ahmad: [Way2Quran](https://way2quran.com/en/reciters/al-zein-muhammad-ahmed)
- Khalid Al-Jaleel: [Apple Podcasts profile](https://podcasts.apple.com/us/podcast/khalid-al-jalil/id1087831900)
- Abdul Rachid Soufi: [Wikipedia](https://en.wikipedia.org/wiki/Abdul_Rachid_Soufi)
- Omar Al-Qazabri: [Al-Qayyim biography](https://alqayyim.com/reciteur-marocain/60-reciteur-omar-kazabri)
- Muammar Z.A.: [Wikipedia](https://en.wikipedia.org/wiki/Muammar_Z.A.)
- Noreen Muhammad Siddiq: [Wikipedia](https://en.wikipedia.org/wiki/Noreen_Muhammad_Siddiq)
- Raad Al-Kurdi: [AlQuranAudio profile](https://alquranaudio.com/en/reciter/221)
- Hazza Al-Balushi: [TVQuran profile](https://www.tvquran.com/en/scholar/183/profile/hazza-albalushi)
- Mansour Al-Salemi: [Mawdoo biography](https://mawdoo3.com/%D9%85%D9%86%D8%B5%D9%88%D8%B1_%D8%A7%D9%84%D8%B3%D8%A7%D9%84%D9%85%D9%8A_%28%D8%AF%D8%A7%D8%B9%D9%8A%D8%A9_%D9%88%D9%82%D8%A7%D8%B1%D8%A6_%D9%82%D8%B1%D8%A2%D9%86_%D8%B3%D8%B9%D9%88%D8%AF%D9%8A%29)
- Islam Sobhi: [TVQuran profile](https://tvquran.com/en/scholar/315/profile/islam-sobhi)

This is display metadata only. It is bundled with the app and causes no additional runtime network request.
