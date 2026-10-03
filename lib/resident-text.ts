// Plain-language resident card text. English is the source; Vietnamese and Arabic are DRAFT translations and must be
// reviewed by native speakers. A suburb's card offers a translation when Census shows that language among its top three.
// Cards never name a facility as a place to go: availability is decided by council at the time (doc 04, relief-centre guidance).

export type Lang = "en" | "vi" | "ar";
/** ABS Census language names for the translations we have. */
export const CENSUS_LANGUAGE: Record<Exclude<Lang, "en">, string> = { vi: "Vietnamese", ar: "Arabic" };

/** English plus every available translation that is among the suburb's Census top home languages. */
export function cardLanguages(topLanguages: string[]): Lang[] {
  return ["en", ...(Object.keys(CENSUS_LANGUAGE) as Exclude<Lang, "en">[]).filter((l) => topLanguages.includes(CENSUS_LANGUAGE[l]))];
}

type Text = {
  name: string; title: (area: string) => string; intro: string;
  hotH: string; hot: string[];
  whereH: string; where: string;
  floodH: string; floodBoth: (riverine: number, storm: number) => string; floodStorm: (storm: number) => string; floodNone: string;
  equipment: string;
  switchH: string; switchItems: string[];
  rebates: string; emergency: string; print: string; draft: string; source: string;
};

export const TEXT: Record<Lang, Text> = {
  en: {
    name: "English",
    title: (a) => `Staying safe in heat and floods: ${a}`,
    intro: "Plain-language advice for your area, based on public data about flooding and on how switching homes from gas to electricity affects safety in heatwaves and blackouts.",
    hotH: "On very hot days",
    hot: ["Drink water often, even if you are not thirsty.", "Close curtains and blinds early in the day.", "Check on older neighbours and anyone living alone.", "Plan where you can go to cool down before a heatwave starts."],
    whereH: "Where to go to cool down",
    where: "During a heatwave, ask your council which cool places are open and whether they have backup power if the electricity goes out. Do not assume a building is open: arrangements change with each emergency.",
    floodH: "Floods",
    floodBoth: (r, s) => `About ${r}% of your area is land that can flood from rivers or creeks, and ${s}% can flood from heavy rain and overflowing drains.`,
    floodStorm: (s) => `About ${s}% of your area can flood from heavy rain and overflowing drains.`,
    floodNone: "Public planning maps show no mapped flood land in your area, but heavy rain can still cause local flooding.",
    equipment: "If your home is on flood-prone land and you get a heat pump, battery or new switchboard, ask the installer to mount it above flood level.",
    switchH: "When you switch off gas",
    switchItems: [
      "A heat pump (reverse-cycle air-conditioning and hot water) replaces gas heating and can also cool your home.",
      "Insulation and draught sealing keep heat out in summer and in during winter.",
      "Shade over windows and walls helps your home stay cool.",
      "If you depend on powered equipment, ask about a home battery for blackouts.",
    ],
    rebates: "Ask your council about current rebates for these upgrades.",
    emergency: "In an emergency, call 000.",
    print: "Print this card",
    draft: "Prototype. Flood figures are from Vicmap planning overlays and languages from the ABS Census 2021. Translations are drafts and need review by native speakers.",
    source: "Source",
  },
  vi: {
    name: "Tiếng Việt",
    title: (a) => `An toàn trong nắng nóng và lũ lụt: ${a}`,
    intro: "Lời khuyên bằng ngôn ngữ đơn giản cho khu vực của bạn, dựa trên dữ liệu công khai về lũ lụt và cách việc chuyển nhà từ gas sang điện ảnh hưởng đến an toàn khi nắng nóng và mất điện.",
    hotH: "Vào những ngày rất nóng",
    hot: ["Uống nước thường xuyên, kể cả khi không khát.", "Kéo rèm và đóng mành từ sáng sớm.", "Hỏi thăm hàng xóm lớn tuổi và những người sống một mình.", "Lên kế hoạch nơi bạn có thể đến để làm mát trước khi đợt nắng nóng bắt đầu."],
    whereH: "Nơi để làm mát",
    where: "Khi có đợt nắng nóng, hãy hỏi hội đồng thành phố những nơi mát mẻ nào đang mở cửa và có điện dự phòng khi mất điện hay không. Đừng cho rằng một tòa nhà luôn mở cửa: việc sắp xếp thay đổi theo từng trường hợp khẩn cấp.",
    floodH: "Lũ lụt",
    floodBoth: (r, s) => `Khoảng ${r}% khu vực của bạn là đất có thể bị ngập do sông hoặc lạch, và ${s}% có thể bị ngập do mưa lớn và cống tràn.`,
    floodStorm: (s) => `Khoảng ${s}% khu vực của bạn có thể bị ngập do mưa lớn và cống tràn.`,
    floodNone: "Bản đồ quy hoạch công khai không cho thấy đất ngập lụt trong khu vực của bạn, nhưng mưa lớn vẫn có thể gây ngập cục bộ.",
    equipment: "Nếu nhà bạn nằm trên đất dễ ngập và bạn lắp máy bơm nhiệt, pin lưu trữ hoặc tủ điện mới, hãy yêu cầu thợ lắp đặt chúng cao hơn mức nước lũ.",
    switchH: "Khi bạn chuyển từ gas sang điện",
    switchItems: [
      "Máy bơm nhiệt (máy lạnh hai chiều và máy nước nóng) thay thế hệ thống sưởi bằng gas và cũng có thể làm mát nhà bạn.",
      "Cách nhiệt và bịt kín khe hở giữ hơi nóng bên ngoài vào mùa hè và giữ ấm vào mùa đông.",
      "Che nắng cho cửa sổ và tường giúp ngôi nhà luôn mát mẻ.",
      "Nếu bạn phụ thuộc vào thiết bị dùng điện, hãy hỏi về pin lưu trữ tại nhà khi mất điện.",
    ],
    rebates: "Hãy hỏi hội đồng thành phố về các khoản hỗ trợ hiện có cho những nâng cấp này.",
    emergency: "Trong trường hợp khẩn cấp, hãy gọi 000.",
    print: "In thẻ này",
    draft: "Bản thử nghiệm. Số liệu lũ lụt lấy từ bản đồ quy hoạch Vicmap và ngôn ngữ từ Điều tra Dân số ABS 2021. Bản dịch là bản nháp và cần người bản ngữ kiểm tra.",
    source: "Nguồn",
  },
  ar: {
    name: "العربية",
    title: (a) => `البقاء آمنًا في الحر والفيضانات: ${a}`,
    intro: "نصائح بلغة بسيطة لمنطقتك، تستند إلى بيانات عامة عن الفيضانات وإلى كيفية تأثير تحويل المنازل من الغاز إلى الكهرباء على السلامة أثناء موجات الحر وانقطاع الكهرباء.",
    hotH: "في الأيام شديدة الحرارة",
    hot: ["اشرب الماء بانتظام حتى لو لم تشعر بالعطش.", "أغلق الستائر في وقت مبكر من اليوم.", "اطمئن على جيرانك كبار السن ومن يعيشون بمفردهم.", "خطط مسبقًا للمكان الذي يمكنك الذهاب إليه للتبريد قبل بدء موجة الحر."],
    whereH: "أين تذهب للتبريد",
    where: "أثناء موجة الحر، اسأل المجلس المحلي عن الأماكن الباردة المفتوحة وما إذا كانت لديها طاقة احتياطية عند انقطاع الكهرباء. لا تفترض أن المبنى مفتوح: الترتيبات تتغير مع كل حالة طوارئ.",
    floodH: "الفيضانات",
    floodBoth: (r, s) => `حوالي ${r}% من منطقتك أرض يمكن أن تغمرها مياه الأنهار أو الجداول، و${s}% يمكن أن تغمرها مياه الأمطار الغزيرة وفيضان المصارف.`,
    floodStorm: (s) => `حوالي ${s}% من منطقتك يمكن أن تغمرها مياه الأمطار الغزيرة وفيضان المصارف.`,
    floodNone: "لا تُظهر خرائط التخطيط العامة أراضي معرضة للفيضان في منطقتك، لكن الأمطار الغزيرة قد تسبب فيضانات محلية.",
    equipment: "إذا كان منزلك على أرض معرضة للفيضان وقمت بتركيب مضخة حرارية أو بطارية أو لوحة كهرباء جديدة، فاطلب من الفني تركيبها فوق مستوى الفيضان.",
    switchH: "عند التحول من الغاز",
    switchItems: [
      "المضخة الحرارية (مكيف هواء للتدفئة والتبريد وسخان مياه) تحل محل التدفئة بالغاز ويمكنها أيضًا تبريد منزلك.",
      "العزل وسد الفتحات يبقيان الحرارة خارج المنزل صيفًا وداخله شتاءً.",
      "تظليل النوافذ والجدران يساعد على إبقاء منزلك باردًا.",
      "إذا كنت تعتمد على أجهزة تعمل بالكهرباء، فاسأل عن بطارية منزلية لحالات انقطاع الكهرباء.",
    ],
    rebates: "اسأل المجلس المحلي عن الدعم المالي المتاح حاليًا لهذه التحسينات.",
    emergency: "في حالات الطوارئ، اتصل بالرقم 000.",
    print: "اطبع هذه البطاقة",
    draft: "نموذج أولي. أرقام الفيضانات من خرائط التخطيط Vicmap واللغات من تعداد ABS لعام 2021. الترجمات مسودات وتحتاج إلى مراجعة من متحدثين أصليين.",
    source: "المصدر",
  },
};
