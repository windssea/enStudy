# v0.64 共享词形卡与图标治理

状态：本地603项单元测试、四种尺寸的答题界面与保存恢复验收通过，等待完整CI和两站同步发布。

上一阶段的实际答题截图显示，WordFormCue仍有旧伙伴贴图、黄色玩具面板和重复动作要求。此次直接修正共享组件，覆盖四年级不规则动词和既有词形专题；课程、题目版本、评分和辅助证据规则不变。

## 词形练习

移除词形卡内的PaintedCompanion和持续关注该插画的暂停观察器，删除原组件的箭头动画和旧样式。当前布局只显示给出的词、共享方向图标与实际练习要求，使用统一浅青绿表面、边界和字号。桌面并排，375px窄屏自然纵排，英文题干保持25px以上，不使用角色来解释操作。

App把词形任务的context交给WordFormCue统一呈现。只省略四条已知泛化重复文案，以及与卡内要求完全相同的文本；额外时间、题量、作答范围或其他自定义说明默认保留。选择/填空题型标识、实际题干、提示、保存状态与辅助结果保持明确。新增一项回归检查验证附加要求不会随精简丢失，不修改内容版本来进行显示层去重。

## 一套公共图标来源

LearningIcon以20个显式导入统一接入lucide-react 1.60.0，保留现有语义kind及ToyPicture兼容入口。公共导航、按钮、课程与练习控件共享这一个图标源；不将教学时间轴、数量图等精确示意图替换为图标。SVG继续24px、1.7线宽，随语义文字隐藏于读屏树，控件名称仍由可见文字提供。

按[Lucide官方React文档](https://lucide.dev/guide/react/)使用具名导入，以便只打包实际使用的图标。版本锁定在package.json和lockfile，新增运行时依赖仅此一项；许可证原文发布在public/licenses/lucide.txt，含Lucide ISC与相关Feather MIT声明。Motion、面板、拖拽等按真实交互需要独立评估，当前静态词形卡不引入这些依赖。

## 构建依赖修复与内容一致性

官方npm审计指出原csv-parse 6.x受[GHSA-8cw4-87c7-c6xx](https://github.com/advisories/GHSA-8cw4-87c7-c6xx)影响，问题位于重复列名路径的原型替换。升级并锁定构建工具csv-parse 7.0.3，未执行批量force升级。升级前后对content、public/content和migrations的135份JSON、MJS、SQL、CSV/TSV逐字节比较，全部一致。当前官方npm审计为0项已知漏洞，不代表不存在未披露缺陷。

无新增或改写数据库迁移，现有独立D1仍至0053；注册、账号、AI服务与密钥配置不变。本地Worker为21301276字节，SHA256 3630b5a5be691f10cb2af39a6a75696dcbda803f3ec90a8055c5f6ec8e44c640，与v0.63完全一致。

## 已取得的验证证据

ui-ux-pro-max的text reflow spacing查询命中Text Reflow and Spacing及Touch Spacing，采用内容自适应与既有触控间距。构建、类型、603项单元/75文件、格式与Worker打包通过；135份内容文件一致，npm依赖树只有一个Lucide版本。

内置浏览器在独立内存D1中创建虚构四年级档案，检查1280×900、768×1024、1024×768与375×812：没有横向溢出，词形卡不加载角色图片，只有一处任务要求，箭头没有动画，公共SVG均来自Lucide并保持aria-hidden。实际选择keep提交后刷新，答案与已保存结果仍恢复；看过示范的take仍显示辅助完成；填空keep提交正常。原有参与奖励语义不变，未将辅助结果改为独立掌握。

本阶段没有完成全站所有旧素材替换、完整四年级教研或真实Pad/儿童研究。UI验收另观察到过去时题库的个别人称语境需审校，例如Did you keep my promise?，已作为后续内容任务记录，不能借本次图标统一宣称全部教学内容已审完。

证据位于忽略目录artifacts/check-v064-final.log、format-v064.log、worker-v064.log、v064-content-compatibility.json、npm-audit-v064-final.json、v064-browser.json及v064-word-cue-*、v064-input-pad.png。实际同步发布结果待补记。
