# 生图交付记录

## 2026-10-23 拖动时态小游戏 · 内置 imagegen

复用 sports-clean-3d-v1，以现有 course-students-v2 基准检查造型。时间轴与人物均为内置 image_gen 工具生成的真实透明底 PNG；PNG 原件在 art-source/，站点使用保留 alpha 的 quality=85 WebP。人物保持原尺寸1024×1536；时间轴仅裁去透明空白，原2172×724，裁切框[33,281,2139,443]，成品2106×162。人物alpha范围0–254，时间轴0–255；分别99596、50168字节。来源为用户授权的原创AI生成素材，不含第三方品牌、文字或水印。

- 人物：art-source/tense-apple-child-sports-v1.png → /art/concepts/sports-v1/tense-apple-child.webp，原生滑块thumb背景，桌面112×168、小屏76×114 CSS像素，脚底为时间标记；无碰撞或物理模拟。
- 时间轴：art-source/tense-timeline-sports-v1.png → /art/concepts/sports-v1/tense-timeline.webp，响应式保留纵横比，时间节点和文本叠加使用真实HTML。标签与动词不烘焙在素材中。
- 同一人物只标记观察时间，不表示所有时态都处于正在吃的状态；结果、习惯、持续和设想由真实文本明确说明。素材登记于learning-art.v1.json，含哈希、尺寸、字节数和替代文字，纳入离线壳。

### 人物最终提示

```text
Use case: illustration-story
Asset type: transparent PNG character sprite for a children's English tense timeline game, sports-clean-3d-v1.
Primary request: a single full-body school-age child eating a red apple, holding the visibly bitten apple up to the mouth, taking a bite with a friendly expression. Original clean stylized 3D game character: warm light beige skin, compact rounded head, simple graphic facial features, neat sculpted dark brown short hair, teal and white modern sports top, navy shorts, white sneakers. Front three-quarter view, stable upright feet, full body centered, readable at 120px high.
Style: smooth matte surfaces, large clean color shapes, softly beveled forms, soft neutral light from upper left, tidy lightweight proportions, matching the project's existing sports students. Not toddler or doll proportions.
Composition: only ONE child and ONE apple, tightly framed with safe transparent margin around all edges, portrait aspect ratio. No ground or scenery. Genuine transparent alpha background, no checkerboard, no text, no watermark, no outline frame.
```

### 时间轴最终提示

```text
Use case: scientific-educational
Asset type: transparent raster timeline rail for a children's English tense dragging game, sports-clean-3d-v1.
Primary request: one clean horizontal timeline track seen straight on, like an elegant slim 3D sports game slider rail. A continuous straight rail with a small left-pointing arrow at the far left and a right-pointing arrow at the far right. Three evenly spaced identical round waypoint discs at 15%, 50%, 85% of the total rail length, precisely on its horizontal centerline. Past third subtle sky blue, middle third mint teal, future third pale lavender, softly transitioning. All three waypoint tops aligned. Low relief satin plastic, softly beveled edges, broad neutral soft light from upper left. Minimal small contact shadow only.
Composition: very wide horizontal isolated track about 6:1 aspect; fill canvas width with safe small margin, vertically center the slim rail with transparent space above and below. No perspective angle or curved path. This asset will be stretched horizontally under an independent draggable character, labels added as real HTML.
Constraints: actual transparent alpha background, ONLY rail arrows and three discs. Absolutely no letters, text, numbers, clocks, people, apples, landscape, ground plane, frame, watermark or checkerboard.
```


模式：内置imagegen，透明背景；下列保留生成与修订提示。实际选用版本以`public/content/learning-art.v1.json`登记为准；课程人物采用文末v2，首轮人物试稿未发布。先前写实/Pixar试稿未接入产品。此前生产图只作WebP格式压缩，不裁剪、重绘或缩放；新增时间轴按本页裁切记录去除透明空白，人物保留原尺寸与alpha。

## telescope-sports-v1.png

风格参考为任天堂NS运动官方页面的现场截图，仅用于视觉参考。

```text
Create a NEW ORIGINAL English-learning game teaching-scene illustration using the reference image ONLY as a rendering and character-design STYLE reference. The desired look is Nintendo Switch Sports / Sportsmates: clean stylised 3D console-game avatars, simplified graphic facial features and oval eyes, small understated nose and mouth, compact smooth face, clean sculpted geometric hair masses, slender simplified limbs, flat clean saturated sportswear, broad bright studio lighting, crisp soft ambient occlusion, subtle satin-plastic material. This is NOT Disney/Pixar, not photographic, no richly textured hair strands or detailed realistic fabric, no toddler chibi/clay look. Create our own distinct school-age girl with short dark bob hair, warm medium skin, aqua sports tee with a single white shoulder stripe, navy shorts and white trainers with mint trim. NEW SCENE: she carefully packs a recognisable small blue telescope into an open navy carrycase on a simple pale wood table. The action must be clear. Single scene, complete character and table framed with comfortable margins. Bright, clean, energetic, refined educational console-game art. Use our own original character and objects; do not copy any particular Nintendo character, clothing design, logos, stadium, scene composition or UI. No words, letters, numerals, arrows, timeline, watermark, brand symbols, floating decorations or background. True transparent alpha background. Colours: aqua, cyan, mint, navy and small coral accents. Make the simple high-quality stylised 3D console-game appearance unmistakable.
```

## stone-sports-v1.png

风格参考为同一官方截图以及上述项目原创基准图。

```text
Generate a NEW original teaching scene in our unified Nintendo Switch Sports-inspired clean stylised 3D console-game visual language. Image 1 is the official game STYLE reference only. Image 2 is our own original character/material/lighting ANCHOR; match its modelling, clean sculpted hair, simple graphic oval eyes, understated face, aqua sports shirt with white shoulder stripe, navy shorts, white/mint trainers, bright clean soft light and refined satin materials. NEW SCENE: two school-age cousins kneeling on a SMALL simple patch of smooth pebbles. The girl with dark ponytail holds up ONE smooth grey stone they have just found; a short dark-haired boy looks at that stone. Keep the held stone clearly recognisable and both children's attention on it. Slender simplified athletic avatar proportions, smooth simple expressive faces, clearly cartoon 3D game characters rather than Disney/Pixar, photography or clay dolls. Clean large colour areas, restrained cyan/aqua, mint, navy, one small coral accent. Minimal surface texture, no realistic stone clutter. Single coherent small educational scene, fully framed characters and pebble patch, generous clear margins. No character from the official game, no telescope/desk/case from Image 2, no Nintendo logos, words, letters, labels, arrows, timeline, border, watermark or decorative stars. Genuine transparent alpha background.
```


## v0.56 首轮课程试稿 · 人物未发布

四张图均以 `art-source/telescope-sports-v1.png` 为同一风格参考，真实透明背景。只压缩为 WebP，原尺寸与 alpha 逐字节保持。

### course-students-sports-v1.png

```text
Create one original educational course scene illustration. Use the attached image strictly as the established rendering/style reference: clean high quality stylized console sports game 3D, simplified graphic facial features, sculpted hair masses, matte and satin materials, soft broad upper-left lighting, aqua/cyan/mint/navy palette, no photorealism, no clay, no toddler proportions. Scene: two primary-school classmates, one girl and one boy aged about 9, standing together in a bright minimal classroom reading corner, each visibly holding one closed school book against their chest. Show a small pale oak bench and a low shelf of books behind them to establish school context; restrained props, no ornate scene. Friendly natural posture, clean sporty school clothing, balanced landscape composition with full bodies and ample breathing room. This depicts 'We are students' and 'We have books', not a mascot or game avatar. No animal, no island, no badge, no writing, letters, numerals, logo, watermark or UI. Transparent background with genuine alpha, retain only the people and small context props plus subtle contact shadows. Match reference material, light and visual proportions.
```

### course-bag-sports-v1.png

```text
Generate one original educational course still-life illustration, not a UI. Style reference is the attached image: the same clean high quality stylized console sports game 3D, carefully bevelled forms, matte and satin materials, soft broad upper-left lighting, aqua cyan mint navy colors with a restrained coral accent. Scene: a single clearly blue school backpack, one graphite pencil, two school rulers with simple unlabelled tick marks, and one closed mint notebook neatly arranged on a small pale oak school desk. The blue bag must be the most prominent object, the pencil and rulers clearly recognizable. No people or animals, no mascots, no island, no photorealism, no clay, no clutter. Full objects inside a balanced landscape composition. No text, numbers, logos or watermark. Transparent background genuine alpha, only objects, the desk and subtle contact shadows. Intended as the course scene for a lesson about school belongings and have/has; visually match the reference lighting and materials.
```

### course-classroom-sports-v1.png

```text
Generate one original educational classroom scene illustration. Use the attached image as strict visual style reference: clean high quality stylized console sports game 3D, simplified graphic eyes, sculpted hair, lightweight natural school-age/adult proportions, matte plus satin surfaces, broad soft light from upper left, pale oak and aqua cyan mint navy. This scene illustrates singular and plural in a classroom. Show EXACTLY TWO separate pale oak pupil desks, each with a mint chair tucked behind, and ONE friendly adult female teacher standing beside the desks, holding a closed book and giving a small welcoming gesture. The teacher must be visibly adult, not a mascot. Clearly separate the two desks so they are countable with no extra table, no joined desks. Minimal clean classroom context, full forms inside a landscape composition. No children or animals or island, no text, numbers, UI, badges, logos, watermark; no photorealism, clay or ornate scenery. Genuine transparent background, retain only teacher, desks, two chairs and light contact shadows. Match the rendering and materials of the reference.
```

### course-library-sports-v1.png

```text
Generate one original educational course scene illustration in exactly the established style of the attached reference: clean high quality stylized console sports game 3D, simplified graphic facial details, sculpted hair, primary school age proportions, matte/satin materials, broad upper-left soft lighting, aqua cyan mint navy with pale oak. A school library helper activity: two primary-school children aged nine, one girl with a short dark bob wearing aqua sports shirt and navy shorts, one boy with short sculpted brown hair wearing white/navy sports shirt and navy shorts. They are actively sorting a small stack of closed books on a low pale-oak library trolley beside one low bookshelf; one child hands a book to the other. Clearly a school library teamwork scene, no librarian desk, no sports equipment. Calm tidy landscape composition, full bodies and props visible, clean silhouettes. No animals, no island, no companion avatar, no badges or name tags; no text, letters, numbers, logos, watermark or UI. No photo skin, hair noise or clay. Genuine transparent alpha background, retain only children, trolley, low shelf and subtle contact shadows. Reference is style only, do not reproduce its telescope.
```


## v0.56 最终课程场景 · 内置 imagegen

首轮人物试稿被用户调整肤色、发型和服装；最终采用 students-v2、classroom-v2、library-v2 与 bag。初稿以 telescope 为风格参考，人物修订以上一稿为编辑目标，library-v2 同时以 students-v2 为人物参考。真实透明背景；只压缩为 WebP，原尺寸与 alpha 逐字节保持。

### course-students-v2-sports-v1.png

```text
Revise this original school course scene. Preserve the composition, EXACTLY two primary school classmates holding one closed book each, low bookshelf, bench, genuine transparent background, clean console sports game stylized 3D and upper-left soft lighting. Update the children to more fashionable original sports-game designs, clearly age 9 not toddler/adult: girl has fair light warm-beige East Asian skin, dark chestnut smooth sculpted hair tied in a sporty high ponytail with a mint band, mint cropped-length sport jacket over white tee, navy athletic shorts, white/mint trainers. Boy has fair light peach European skin, short sandy-blond sculpted side-swept hair, white/cyan/navy color-block sports tee, navy athletic shorts and white sneakers with a small coral accent. Modern clean athletic cuts, sculpted hair masses, simplified graphic face features, no realistic skin or hair noise, no clay. Skin must be visibly pale/fair warm natural beige, not tan, brown or golden-orange; avoid warm orange skin lighting. Books remain clearly held. No logos/text/labels, animals, island, mascot or UI. Keep full bodies fully framed and retain airy composition. Light cyan mint navy palette. Transparent alpha, no background haze or glow.
```

### course-classroom-v2-sports-v1.png

```text
Edit this original classroom illustration. Keep exactly ONE adult female teacher and EXACTLY TWO separate desks with two mint chairs, unchanged count and clear separation, the same layout and upper-left soft light, genuine transparent alpha. Change teacher to fair light neutral-warm beige East Asian skin, a stylish short sculpted chestnut bob, clean mint zip jacket over white tee, tailored navy trousers and white low-profile trainers. Clearly adult teacher age about 30, calm friendly face; use simplified graphic eyes, clean stylized console sports game 3D matching original materials, not realistic, not clay or toddler. Make skin visibly light/fair without orange or tan shading. Retain pale oak desks and mint chairs, book in teacher's arm, welcoming gesture, no extra people or furniture. No words, letters, numerals, logos, animals, island or UI. Transparent background, no glows.
```

### course-library-v2-sports-v1.png

```text
Update this original school-library scene to match our new student cast and fashionable sports clothing. Keep two nine-year-old children sorting books using a low book trolley and low shelf; preserve action, clearly held book, tidy minimal composition, genuine transparency and soft upper-left light. Girl: fair light warm-beige East Asian skin, chestnut sculpted high ponytail with mint band, mint athletic zip jacket with white sleeve stripe over white tee, navy sport shorts with white piping, white/mint sneakers. Boy: fair light peach European skin, sandy blond sculpted side-swept hair, white/cyan/navy color-block sport tee, navy sport shorts with white piping, white shoes with small coral accent. Both clearly primary-school age, not toddler, not adult; clean stylized console sports game 3D, matte and satin materials, simplified graphic faces, no photo texture, no clay. Skin pale/fair neutral-warm beige, not tan or brown or golden-orange. Full bodies and trolley fully inside frame with generous margin; shelf should not be cropped at left. No text, number, logo, island, animals or UI. Genuine transparent alpha, no background glow. Use second image as identity, clothing, skin and rendering reference for the same two students.
```

### course-bag-sports-v1.png

```text
Generate one original educational course still-life illustration, not a UI. Style reference is the attached image: the same clean high quality stylized console sports game 3D, carefully bevelled forms, matte and satin materials, soft broad upper-left lighting, aqua cyan mint navy colors with a restrained coral accent. Scene: a single clearly blue school backpack, one graphite pencil, two school rulers with simple unlabelled tick marks, and one closed mint notebook neatly arranged on a small pale oak school desk. The blue bag must be the most prominent object, the pencil and rulers clearly recognizable. No people or animals, no mascots, no island, no photorealism, no clay, no clutter. Full objects inside a balanced landscape composition. No text, numbers, logos or watermark. Transparent background genuine alpha, only objects, the desk and subtle contact shadows. Intended as the course scene for a lesson about school belongings and have/has; visually match the reference lighting and materials.
```


## v0.57 苹果时态对比 · 内置 imagegen

whole以最新运动服学生图为材质/光照参考；progress和finished均编辑whole保持同一苹果和盘子。PNG原件保留，WebP仅格式压缩，原尺寸与alpha逐字节一致。

### apple-whole-sports-v1.png

```text
Create ONE original educational object illustration in our clean console sports-game 3D style. Attached image is STYLE REFERENCE ONLY, use its carefully modelled matte/satin materials, clean cyan/mint palette, soft broad upper-left lighting, no photo textures or clay. Subject: one fresh red apple with a short brown stem and one small green leaf, sitting centered on one plain small white ceramic snack plate with a thin mint rim. Simple readable whole apple silhouette. No bite, no cut, no other food, no utensils, no human or mascot. Complete plate and apple fully visible with comfortable margin. Three-quarter view slightly above plate, clean high-quality rounded modelling, subtle contact shadow. Transparent background genuine alpha, no backdrop glow, no words, numerals, timeline, labels, logo or watermark. This is the intact apple state in a coherent English tense teaching sequence; later images must match the same apple, plate, camera and light.
```

### apple-progress-sports-v1.png

```text
Make the middle eating-progress state of this same educational apple illustration. Keep exactly the same red apple identity, stem, green leaf, white plate with thin mint rim, camera angle, scale, soft upper-left lighting, clean stylized console-game 3D materials and genuine transparent background. Change only the apple: several substantial rounded bite marks have removed about half the edible flesh from the front/right side, clearly revealing pale cream flesh, while enough red flesh remains to show it is not finished. Must look bitten, not sliced cleanly or cut in half by a knife. Keep it upright on the plate, one single apple only, no extra fruit, no human or hand, no utensils, no text, logos, arrows, timeline, or UI. Full plate visible with margin. No photorealistic noise; smooth refined modelled forms. This represents 'in progress', not 'finished'. Genuine transparent alpha, no background glow.
```

### apple-finished-sports-v1.png

```text
Create the finished eating state of the SAME educational apple sequence from this reference image. Preserve the same plate (white with thin mint rim), camera angle, overall framing, soft upper-left light, clean stylized console sports game 3D modelled materials and genuine transparent alpha. Change only the apple to a clearly eaten apple core: almost all edible flesh has been bitten away on all sides, leaving a slim upright pale core with small red skin caps at top and bottom, original short brown stem and one green leaf. Recognizable central apple core, not half an apple, no knife cuts, no extra apples, human, hand, utensils or crumbs. Full plate inside frame, generous margin. Smooth refined modelling, no photorealistic noise or clay. No text, numerals, labels, logos, arrows, timeline, UI or backdrop glow. This represents the result 'the apple has been eaten' for teaching, with the plate and lighting consistent with previous stages.
```
