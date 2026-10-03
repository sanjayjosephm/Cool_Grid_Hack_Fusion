// Plain-language resident card text. English is the source; Vietnamese and Arabic are DRAFT translations
// (two of the most common languages in Brimbank, Maribyrnong and Hume) and must be reviewed by native speakers.

export type Lang = "en" | "vi" | "ar";
export type Upgrade = "heatpump" | "insulation" | "shading" | "solar" | "battery" | "floodproof";

type Text = {
  name: string; title: (area: string) => string; intro: string;
  heatH: string; levels: Record<"ready" | "support" | "high" | "urgent", string>; heatHigh: string; heatMedium: string; heatLow: string;
  hubH: string; hubPass: (site: string) => string; hubUnverified: (site: string) => string; hubNone: string;
  floodH: string; floodHigh: string; floodModerate: string;
  pkgH: string; upgrades: Record<Upgrade, string>;
  tipsH: string; tips: string[]; rebates: string; print: string; draft: string;
};

export const TEXT: Record<Lang, Text> = {
  en: {
    name: "English",
    title: (a) => `Staying safe in the heat: ${a}`,
    intro: "This card explains, in plain language, what extreme heat means for your area and how switching off gas can keep your home safe.",
    heatH: "Heat risk in your area",
    levels: { ready: "Lower", support: "Medium", high: "High", urgent: "Very high" },
    heatHigh: "Your area gets very hot, and many homes trap heat or lose cool air quickly. Take hot days seriously.",
    heatMedium: "Your area gets hot on some days, and some homes need upgrades to stay cool.",
    heatLow: "Your area is less exposed than most nearby, but very hot days are still dangerous.",
    hubH: "Where to go on very hot days",
    hubPass: (s) => `${s} has backup power and should stay cool for at least 6 hours, even in a blackout.`,
    hubUnverified: (s) => `${s} is a cooling space, but its backup power has not been confirmed to work in a blackout. Check before you go.`,
    hubNone: "There is no cooling space with backup power in your area yet. Plan ahead: a library, shopping centre or friend's home with air-conditioning.",
    floodH: "Floods",
    floodHigh: "Parts of your area can flood. If you get a heat pump, battery or new switchboard, ask the installer to mount it above flood level.",
    floodModerate: "Some streets can flood. Ask your installer whether equipment should be mounted higher.",
    pkgH: "Upgrades to ask about when you switch off gas",
    upgrades: {
      heatpump: "Heat pump (reverse-cycle air-conditioning and hot water): replaces gas heating and also cools",
      insulation: "Insulation and draught sealing: keeps heat out in summer and in during winter",
      shading: "Shade or a cool roof: keeps sun off windows and walls",
      solar: "Rooftop solar: cheaper power on sunny days",
      battery: "A home battery: keeps essentials running in a blackout",
      floodproof: "Equipment mounted up high: protects it from floods",
    },
    tipsH: "On very hot days",
    tips: ["Drink water often, even if you are not thirsty.", "Close curtains and blinds early in the day.", "Check on older neighbours and anyone living alone.", "In an emergency, call 000."],
    rebates: "Ask your council about current rebates for these upgrades.",
    print: "Print this card",
    draft: "Prototype with sample data. Translations are drafts and need review by native speakers.",
  },
  vi: {
    name: "Tiếng Việt",
    title: (a) => `An toàn trong nắng nóng: ${a}`,
    intro: "Thẻ này giải thích bằng ngôn ngữ đơn giản nắng nóng cực độ có ý nghĩa gì đối với khu vực của bạn, và việc chuyển từ gas sang điện có thể giúp ngôi nhà của bạn an toàn như thế nào.",
    heatH: "Mức độ rủi ro nắng nóng tại khu vực của bạn",
    levels: { ready: "Thấp hơn", support: "Trung bình", high: "Cao", urgent: "Rất cao" },
    heatHigh: "Khu vực của bạn rất nóng, và nhiều ngôi nhà bị hầm nóng hoặc nhanh mất hơi mát. Hãy cẩn trọng vào những ngày nóng.",
    heatMedium: "Khu vực của bạn có những ngày nóng, và một số ngôi nhà cần nâng cấp để luôn mát mẻ.",
    heatLow: "Khu vực của bạn ít bị ảnh hưởng hơn hầu hết các khu lân cận, nhưng những ngày rất nóng vẫn nguy hiểm.",
    hubH: "Nơi để đến vào những ngày rất nóng",
    hubPass: (s) => `${s} có nguồn điện dự phòng và sẽ mát ít nhất 6 giờ, kể cả khi mất điện.`,
    hubUnverified: (s) => `${s} là nơi tránh nóng, nhưng nguồn điện dự phòng chưa được xác nhận là hoạt động khi mất điện. Hãy kiểm tra trước khi đến.`,
    hubNone: "Khu vực của bạn chưa có nơi tránh nóng có điện dự phòng. Hãy lên kế hoạch trước: thư viện, trung tâm mua sắm hoặc nhà người quen có máy lạnh.",
    floodH: "Lũ lụt",
    floodHigh: "Một số nơi trong khu vực của bạn có thể bị ngập. Nếu bạn lắp máy bơm nhiệt, pin lưu trữ hoặc tủ điện mới, hãy yêu cầu thợ lắp đặt chúng cao hơn mức nước lũ.",
    floodModerate: "Một số con đường có thể bị ngập. Hãy hỏi thợ lắp đặt xem có nên đặt thiết bị cao hơn không.",
    pkgH: "Những nâng cấp nên hỏi khi chuyển từ gas sang điện",
    upgrades: {
      heatpump: "Máy bơm nhiệt (máy lạnh hai chiều và máy nước nóng): thay thế hệ thống sưởi bằng gas và cũng làm mát",
      insulation: "Cách nhiệt và bịt kín khe hở: giữ hơi nóng bên ngoài vào mùa hè và giữ ấm vào mùa đông",
      shading: "Mái che hoặc mái phản nhiệt: che nắng cho cửa sổ và tường",
      solar: "Pin mặt trời trên mái: điện rẻ hơn vào những ngày nắng",
      battery: "Pin lưu trữ tại nhà: duy trì các thiết bị thiết yếu khi mất điện",
      floodproof: "Lắp thiết bị ở vị trí cao: bảo vệ thiết bị khỏi lũ lụt",
    },
    tipsH: "Vào những ngày rất nóng",
    tips: ["Uống nước thường xuyên, kể cả khi không khát.", "Kéo rèm và đóng mành từ sáng sớm.", "Hỏi thăm hàng xóm lớn tuổi và những người sống một mình.", "Trong trường hợp khẩn cấp, hãy gọi 000."],
    rebates: "Hãy hỏi hội đồng thành phố về các khoản hỗ trợ hiện có cho những nâng cấp này.",
    print: "In thẻ này",
    draft: "Bản thử nghiệm với dữ liệu mẫu. Bản dịch là bản nháp và cần người bản ngữ kiểm tra.",
  },
  ar: {
    name: "العربية",
    title: (a) => `البقاء آمنًا في الحر: ${a}`,
    intro: "توضح هذه البطاقة بلغة بسيطة ما تعنيه الحرارة الشديدة لمنطقتك، وكيف يمكن أن يساعد التحول من الغاز إلى الكهرباء في الحفاظ على سلامة منزلك.",
    heatH: "مستوى خطر الحر في منطقتك",
    levels: { ready: "أقل", support: "متوسط", high: "مرتفع", urgent: "مرتفع جدًا" },
    heatHigh: "منطقتك تصبح حارة جدًا، والعديد من المنازل تحبس الحرارة أو تفقد البرودة بسرعة. خذ الأيام الحارة على محمل الجد.",
    heatMedium: "تصبح منطقتك حارة في بعض الأيام، وتحتاج بعض المنازل إلى تحسينات لتبقى باردة.",
    heatLow: "منطقتك أقل تعرضًا من معظم المناطق المجاورة، لكن الأيام شديدة الحرارة تبقى خطيرة.",
    hubH: "إلى أين تذهب في الأيام شديدة الحرارة",
    hubPass: (s) => `${s} لديه طاقة احتياطية ويجب أن يبقى باردًا لمدة 6 ساعات على الأقل، حتى أثناء انقطاع الكهرباء.`,
    hubUnverified: (s) => `${s} مكان للتبريد، لكن لم يتم التأكد من أن طاقته الاحتياطية تعمل أثناء انقطاع الكهرباء. تحقق قبل الذهاب.`,
    hubNone: "لا يوجد بعد مكان للتبريد مزود بطاقة احتياطية في منطقتك. خطط مسبقًا: مكتبة أو مركز تسوق أو منزل صديق مزود بمكيف هواء.",
    floodH: "الفيضانات",
    floodHigh: "قد تغمر المياه أجزاء من منطقتك. إذا قمت بتركيب مضخة حرارية أو بطارية أو لوحة كهرباء جديدة، فاطلب من الفني تركيبها فوق مستوى الفيضان.",
    floodModerate: "قد تغمر المياه بعض الشوارع. اسأل الفني عما إذا كان يجب تركيب المعدات في مكان أعلى.",
    pkgH: "تحسينات اسأل عنها عند التحول من الغاز",
    upgrades: {
      heatpump: "مضخة حرارية (مكيف هواء للتدفئة والتبريد وسخان مياه): تحل محل التدفئة بالغاز وتوفر التبريد أيضًا",
      insulation: "العزل وسد الفتحات: يبقي الحرارة خارج المنزل صيفًا وداخله شتاءً",
      shading: "مظلات أو سقف عاكس للحرارة: يحمي النوافذ والجدران من الشمس",
      solar: "ألواح شمسية على السطح: كهرباء أرخص في الأيام المشمسة",
      battery: "بطارية منزلية: تبقي الأجهزة الأساسية تعمل أثناء انقطاع الكهرباء",
      floodproof: "تركيب المعدات في مكان مرتفع: يحميها من الفيضانات",
    },
    tipsH: "في الأيام شديدة الحرارة",
    tips: ["اشرب الماء بانتظام حتى لو لم تشعر بالعطش.", "أغلق الستائر في وقت مبكر من اليوم.", "اطمئن على جيرانك كبار السن ومن يعيشون بمفردهم.", "في حالات الطوارئ، اتصل بالرقم 000."],
    rebates: "اسأل المجلس المحلي عن الدعم المالي المتاح حاليًا لهذه التحسينات.",
    print: "اطبع هذه البطاقة",
    draft: "نموذج أولي ببيانات تجريبية. الترجمات مسودات وتحتاج إلى مراجعة من متحدثين أصليين.",
  },
};
