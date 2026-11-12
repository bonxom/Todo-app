# Khuyến khích A2UI qua system prompt

Ngày: 2026-11-12. Trạng thái: đặc tả bàn giao, đã điều chỉnh theo yêu cầu người dùng; chưa sửa code.

## 1. Mục tiêu và phạm vi

Khi người dùng yêu cầu thống kê, tổng kết, báo cáo tiến độ, so sánh, lịch trình hoặc giải thích quy trình, system prompt khuyến khích agent chủ động cân nhắc trình bày trực quan bằng A2UI. Người dùng không cần nói thêm “hãy vẽ biểu đồ”.

**Chỉ thay lời hướng dẫn lựa chọn trong system prompt. Không tự nạp nội dung guidance A2UI từ đầu.** Giữ luồng agent tự gọi `load_skill` khi thấy nội dung phù hợp; sau khi nhận guidance, agent mới dùng UI theo contract hiện có.

Không buộc mọi câu trả lời thành UI. Chào hỏi, xác nhận ngắn, một thông tin đơn lẻ và yêu cầu chỉ trả lời bằng văn bản vẫn dùng text.

## 2. Hiện trạng và điểm thay đổi

- `backend/services/agentUiService.ts::formatDeveloperUiSkillContext` sinh phần hướng dẫn UI ngắn được ghép vào system prompt bởi `agentService.ts`.
- Hiện phần này chủ yếu thông báo có skill UI và yêu cầu load trước khi gọi tool, chưa khuyến khích rõ các tình huống thường gặp như thống kê/tổng kết.
- `present_ui` và thuộc tính `presentation` của `propose_tasks` chỉ được expose khi guidance đã có trong provider context hợp lệ. Cơ chế này giữ nguyên.
- Capability check có thể đọc registry ở backend để kiểm tra skill. Việc đó không đồng nghĩa inject toàn bộ skill vào model context; không cần thay capability check.

Phần implementation chính dự kiến chỉ sửa nội dung trả về của `formatDeveloperUiSkillContext`. `agentService.ts` đã ghép kết quả helper vào system prompt nên không cần thay vòng lặp tool hoặc tạo helper bootstrap mới.

## 3. Nội dung system prompt

Hướng dẫn ngắn bằng tiếng Anh, theo ngôn ngữ hiện dùng trong system prompt. Nội dung đề xuất:

> When the user asks for statistics, a summary, a progress report, comparisons, a schedule, or an explanation of a process, proactively consider A2UI if a visual layout makes the answer easier to understand. Do not wait for an explicit request for a chart or dashboard. When a visual response is useful, call load_skill for the available developer UI skill, read its guidance, then choose the appropriate UI tool. Gather the required data before presenting; never invent numbers to create a chart. Use plain text for brief answers or when the user requests text only. Do not ask for permission merely to choose a visual format.

Giữ phần catalog summary hiện có, gồm skill ID/description, và yêu cầu load guidance trước khi gọi `present_ui` hoặc truyền `presentation` vào `propose_tasks`. Không chép component schemas, toàn bộ SKILL.md hoặc ví dụ SurfaceSpec dài vào system prompt.

Các trường hợp cần hiểu:

| Yêu cầu                                       | Hành vi được khuyến khích                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| “Thống kê công việc tuần này”                 | Đọc dữ liệu, cân nhắc load UI skill để trình bày Stat/Table/Chart phù hợp              |
| “Tổng kết tiến độ các project”                | Cân nhắc bố cục nhóm, bảng hoặc số liệu tổng kết có căn cứ                             |
| “So sánh hai phương án này”                   | Cân nhắc bảng hoặc Card so sánh khi hữu ích                                            |
| “Sắp lịch học cho tuần tới”                   | Cân nhắc lịch trình trực quan; read-only hay proposal theo intent và guidance hiện tại |
| “Giải thích quy trình xử lý request”          | Cân nhắc Diagram nếu quan hệ/luồng dễ hiểu hơn khi được vẽ                             |
| “Hôm nay ngày mấy?”, “Cảm ơn”                 | Trả text, không load UI skill chỉ để bọc một câu                                       |
| “Tổng kết bằng văn bản, không dùng giao diện” | Tôn trọng yêu cầu text                                                                 |
| “Vẽ thống kê” nhưng chưa có dữ liệu           | Đọc dữ liệu hoặc làm rõ phần thực sự thiếu, không bịa số liệu                          |

Đây là hướng dẫn ngữ nghĩa cho model, không router regex hoặc danh sách từ khóa bắt buộc. Không ép biểu đồ khi Table/Text đủ rõ. Agent không cần hỏi riêng người dùng để xin chọn cách trình bày.

## 4. Luồng giữ nguyên

1. Request model đầu: có system prompt ngắn và catalog summary; chưa có full UI guidance hoặc synthetic UI loader exchange.
2. Agent quyết định cần trực quan, gọi `load_skill` với UI skill được công bố; có thể đọc dữ liệu theo luồng hiện tại.
3. Loader trả guidance. Snapshot của provider request tiếp theo xác nhận document/version/hash hợp lệ.
4. `present_ui` hoặc `presentation` xuất hiện khi đủ điều kiện hiện có. Agent dùng tool sau khi đã lấy đủ dữ liệu.
5. Validation, feedback sửa payload sai, fallback text/proposal và persistence tiếp tục theo runtime hiện tại.

Không thay `session.canExpose`, `session.canExecute`, sourceRequestId, provider-context acceptance, tool_choice, budget hoặc giới hạn payload. Không bỏ yêu cầu load skill trong turn mới và không dùng history như bằng chứng đã load ở turn hiện tại.

Composition disabled hoặc thiếu skill: không quảng bá khả năng UI không sẵn có. Giữ hành vi helper trả chuỗi rỗng khi capability disabled và fallback hiện tại.

Ask mode vẫn hỏi khi thiếu quyết định nội dung quan trọng. Legacy task_proposal intent, điều kiện presentation và Confirm để tạo task vẫn giữ nguyên. Bản này không sửa quy tắc “omit presentation by default” trong skill; chỉ tăng tín hiệu khuyến khích ở system prompt như người dùng yêu cầu.

## 5. Kiểm thử và đánh giá

### Kiểm thử kỹ thuật

- Request đầu vẫn không chứa full skill hoặc synthetic `load_skill` exchange cho UI; `present_ui` và proposal presentation vẫn bị gate.
- Sau một lần model gọi loader thành công, UI được expose và valid surface thực thi như trước.
- Disabled/missing guidance, stale/tampered evidence, readonly write attempts và malformed proposal presentation vẫn được xử lý như hiện tại.
- System prompt chỉ thêm lời khuyến khích ngắn, không nhân đôi guidance hay tăng giới hạn context.
- Chạy các runtime/capability/skill tests hiện có và regression suites theo plan.

Không dùng một mocked model đã được lập trình sẵn để kết luận agent thật sử dụng UI thường xuyên hơn. Tests về prompt payload chỉ xác nhận integration/contract.

### Đánh giá hành vi bằng model thật

Dùng 8 tình huống trong bảng mục 3, mỗi tình huống 3 lượt, cùng model/config trước và sau thay prompt; dữ liệu synthetic, không task thật hoặc outbound search. Chặn writes để đánh giá cách chọn hình thức mà không ghi dữ liệu.

Ghi: có gọi load_skill UI hay không; kết quả cuối là text/readonly/proposal; loại component; dữ liệu có căn cứ; lỗi validation; số vòng provider và latency. Không thêm metrics production hoặc live harness phức tạp chỉ cho thay đổi prompt này. Có thể dùng công cụ đánh giá sẵn có hoặc một test opt-in nếu cần.

Với 5 tình huống đầu và đủ dữ liệu, kỳ vọng số lần chọn visual tăng so với baseline; không đặt quota buộc model dùng UI cho mọi câu trả lời. Hai tình huống text phải tôn trọng text; tình huống thiếu dữ liệu không được bịa số liệu. Nếu không có live credentials hoặc baseline, ghi rõ chưa xác minh mức cải thiện, không suy ra từ tests mock.

## 6. Acceptance criteria

| ID  | Điều kiện                                                                                            |
| --- | ---------------------------------------------------------------------------------------------------- |
| A1  | System prompt khuyến khích trực quan cho thống kê, tổng kết, tiến độ, so sánh, lịch trình, quy trình |
| A2  | Không preload full UI guidance, không bootstrap loader, không mở UI tools ngay request đầu           |
| A3  | Model vẫn load skill theo nhu cầu rồi mới dùng UI; context/authorization gates giữ nguyên            |
| A4  | Text ngắn và yêu cầu text-only được tôn trọng; không xin phép riêng chỉ để chọn visual               |
| A5  | Không bịa số liệu; task writes/Confirm và fallback không thay đổi                                    |
| A6  | Có kết quả regression tests và ghi rõ mức kiểm chứng live behavior                                   |

## 7. Non-goals và rollback

Không sửa SKILL.md/manifest, không rút skill xuống 6.000 ký tự, không thêm bootstrap service, metrics, component, API field, dependency hoặc renderer. Không nới schema, quyền ghi dữ liệu hay default flags.

Rollback bằng cách revert thay đổi prompt, không cần migration. Bản này thay thế bản nháp proactive-A2UI trước đó; các tài liệu A2UI hiện hữu về lazy loading và an toàn vẫn có hiệu lực.
