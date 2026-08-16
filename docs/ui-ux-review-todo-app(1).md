# Đánh giá UI/UX màn hình Todo Page

## 1. Tổng quan

Điểm số tham khảo:

- **UI:** 7.4/10
- **UX:** 6.8/10

Điểm mạnh:

- Màu sắc nhẹ, dễ nhìn
- Card, button, badge tương đối đồng bộ
- Primary action `Add Task` nổi bật
- Status filter mới gọn hơn và có khả năng mở rộng
- Project progress dễ đọc

Các vấn đề lớn còn lại chủ yếu nằm ở:

- Information hierarchy
- Vị trí và phạm vi tác động của status filter
- Project progress bị ảnh hưởng bởi filter
- Task list nằm quá sâu phía dưới
- Information density
- Status interaction model của task
- Một số thông tin progress bị lặp

Vấn đề cốt lõi vẫn là:

> **Đây là màn hình Today nhưng Project/Progress đang chiếm visual priority cao hơn những task người dùng thực sự cần xử lý hôm nay.**

---

## 2. Đánh giá từng khu vực

| Khu vực | Đánh giá | Vấn đề | Khuyến nghị | Mức độ |
|---|---|---|---|---|
| Header Today | Khá tốt | Ngày là secondary information nhưng đang khá dài | Giữ `Today`, rút gọn date hoặc giảm visual weight | P2 |
| Status filter trên header | Cải thiện tốt | Gọn hơn bản cũ nhưng khá xa task list; scope chưa thật rõ | Xác định rõ filter áp dụng cho task list hay toàn bộ dashboard | P1 |
| Sidebar | Visual sạch | Icon-only làm giảm discoverability | Thêm tooltip và hỗ trợ expand | P1 |
| Todos header | Chưa tối ưu | `111 completed` nổi bật hơn số task còn lại | Ưu tiên `17 remaining` hoặc số việc hôm nay | P1 |
| Add Task / Category / Project | Khá tốt | 3 CTA vẫn hơi ngang cấp | Giữ Add Task primary, các action còn lại secondary | P2 |
| Project Focus | Visual tốt | Chiếm quá nhiều first viewport | Compact/collapse project cards hoặc đưa xuống dưới task list | P1 |
| All Tasks card | Có duplication | Lặp số task và progress đã xuất hiện nơi khác | Chỉ giữ một summary rõ ràng | P1 |
| Project cards | Dễ hiểu | Progress hiện thay đổi theo status filter, dễ gây hiểu nhầm | Project progress nên dùng dữ liệu toàn project hoặc phải ghi rõ đang filtered | **P0/P1** |
| Show Completed Projects | Hợp lý | Checkbox hơi giống form setting | Có thể đổi thành toggle/filter chip | P2 |
| Search | Tốt | Nằm gần task list nhưng status filter lại ở header | Cân nhắc gom Search + Filter + Sort thành một task toolbar | P1 |
| Task list | Sạch | Mỗi row còn hơi cao | Giảm khoảng 20–30% chiều cao | P1 |
| Task status | Chưa ổn semantic | Checkbox vẫn không diễn đạt tốt workflow nhiều trạng thái | Dùng status control riêng hoặc đơn giản hóa state model | P0 |
| Edit / Give up / Delete | Đủ action | Icon-only cần tooltip, delete luôn visible gây noise | Đưa secondary/danger action vào menu `...` | P2 |
| Assistant floating button | Dễ thấy | Có thể che bottom content/action | Thu gọn hoặc tăng safe area | P1 |
| Overall progress | Dễ đọc | Có nguy cơ lặp lại với project/all-task summary | Chỉ giữ nếu mang insight riêng | P2 |

---

## 3. Status filter mới: cải thiện đúng hướng

Phiên bản mới đã thay:

```text
Only show in-progress
```

bằng dropdown:

```text
All tasks ▾
```

và khi chọn nhiều trạng thái:

```text
2 statuses ▾
```

Đây là một cải thiện tốt.

### Điểm tốt

Status filter mới:

- Không còn bị giới hạn vào riêng `In Progress`
- Có khả năng chọn nhiều trạng thái
- Label `2 statuses` cho biết đang có active filter
- Có thể mở rộng thêm state trong tương lai
- Không còn duplicate trực tiếp với hàng tab `All / Pending / In Progress / Completed / Given Up`

Về interaction design, hướng này tốt hơn phiên bản trước.

---

## 4. Nhưng cần xác định rõ **scope của status filter**

Vấn đề mới xuất hiện là filter đang nằm ở **global header**, trong khi Search lại nằm ngay phía trên task list.

Điều này làm user khó biết:

> Status filter đang lọc riêng task list, hay lọc cả Project Focus phía trên?

Screenshot thứ hai cho thấy khi chọn `2 statuses`:

```text
All Tasks     0 / 1
OrbitApp      0 / 1
Viettel       0 / 0
Standalone    0 / 0
```

Trong khi screenshot ban đầu:

```text
All Tasks     111 / 128
OrbitApp      0 / 1
Viettel       19 / 20
Standalone    38 / 46
```

Tức là status filter dường như **đang tác động cả project cards và progress statistics**, chứ không chỉ task list.

Đây là vấn đề UX quan trọng hơn chuyện duplicate filter trước đó.

---

## 5. Project progress không nên âm thầm thay đổi theo task filter

Ví dụ bình thường:

```text
Viettel
19 / 20
95%
```

Sau khi filter status:

```text
Viettel
0 / 0
0%
No tasks in this project yet
```

User rất dễ hiểu rằng:

> Project Viettel không có task nào.

Trong thực tế project vẫn có 20 task, chỉ là **không có task nào match filter hiện tại**.

Đây là một khác biệt semantic rất lớn.

### Không nên hiển thị

```text
No tasks in this project yet
```

nếu project thật sự có task nhưng chúng bị filter ra.

### Nên hiển thị một trong các cách sau

#### Cách 1 — Project progress luôn là global progress

```text
Viettel
19 / 20
95%
```

Status filter chỉ ảnh hưởng danh sách task phía dưới.

Đây là hướng tôi ưu tiên.

#### Cách 2 — Nếu muốn card cũng phản ánh filter

Phải ghi rõ:

```text
0 tasks match current filter
Overall: 19 / 20 completed
```

hoặc:

```text
No tasks match selected statuses
```

Tuyệt đối không dùng:

```text
No tasks in this project yet
```

vì thông tin đó không đúng với trạng thái thực tế của project.

---

## 6. Cần quyết định status filter là Global Filter hay Task Filter

Hiện UI đang nằm giữa hai mô hình.

### Mô hình A — Global dashboard filter

Status filter ở header:

```text
[ 2 statuses ▾ ]
```

và nó ảnh hưởng:

- Project cards
- Counters
- Progress
- Task list

Nếu chọn mô hình này thì toàn bộ dashboard cần biểu đạt rõ trạng thái filtered.

Ví dụ thêm:

```text
Showing tasks with: Pending, In Progress
```

và project card nên dùng terminology:

```text
Matching tasks
```

thay vì coi filtered data là toàn bộ dữ liệu project.

### Mô hình B — Task list filter

Status filter chỉ ảnh hưởng task list.

Khi đó nên đặt cùng Search:

```text
[ Search tasks... ] [ Status ▾ ] [ Project ▾ ] [ Priority ▾ ] [ Sort ▾ ]
```

Project Focus phía trên giữ nguyên overall project metrics.

### Khuyến nghị

Với màn hình hiện tại, tôi ưu tiên **Mô hình B**.

Lý do:

- Project cards đang đóng vai trò summary
- Progress cần ổn định để user theo dõi project
- Filter có giá trị nhất khi dùng để tìm task
- Tránh project progress nhảy từ `95%` thành `0%` chỉ vì user đổi task filter

---

## 7. Hierarchy vẫn chưa đúng với trang “Today”

Mặc dù status filter đã tốt hơn, task chính vẫn nằm khá sâu phía dưới.

First viewport hiện ưu tiên:

1. Workspace
2. Todos
3. Completed / visible counters
4. Add Task / Add Category / Add Project
5. Project Focus
6. Project cards
7. Standalone
8. Search
9. Task list

Trong một màn hình tên **Today**, user phải scroll qua phần lớn dashboard mới tới task cần làm.

Mental model của Today nên là:

```text
Today
→ Việc cần làm
→ Việc quá hạn
→ Việc đang tiến hành
→ Sau đó mới tới project summary
```

---

## 8. Nên đưa task list lên trước Project Focus

Một layout phù hợp hơn:

```text
Today
Sunday, August 16

3 tasks remaining                    + Add Task

[ Search tasks... ] [ Status ▾ ] [ Sort ▾ ]

TODAY

☐ Refactor lại lõi vật
  OrbitApp · Study · High · Due today

────────────────────────────────────

PROJECTS                           View all

OrbitApp              0 / 1
Viettel              19 / 20
Standalone           38 / 46
```

Điểm quan trọng:

> User thấy ngay việc cần làm mà không cần scroll qua toàn bộ project dashboard.

---

## 9. Header đang có hai context: `Today` và `Todos`

Trên cùng:

```text
Today
Tasks and focus for the day
```

Sau đó:

```text
WORKSPACE
Todos
```

Hai heading đều khá mạnh.

Điều này tạo cảm giác user đang ở cả:

- Today page
- Todos workspace

cùng lúc.

### Có thể xử lý theo một trong hai hướng

#### Hướng 1 — Today là page chính

```text
Today
3 tasks remaining
```

Bỏ heading lớn `Todos`.

#### Hướng 2 — Todos là page chính

```text
Todos
```

và `Today` trở thành một navigation/filter context.

Hiện tại cả hai đang cạnh tranh hierarchy.

---

## 10. Counter đầu trang vẫn tập trung sai thông tin

Hiện tại:

```text
111 completed
128 visible tasks
```

Thông tin quan trọng hơn với user là:

```text
17 remaining
```

hoặc trong Today:

```text
1 due today
```

Ví dụ:

```text
17 remaining · 111 completed
```

Nếu filter đang active:

```text
1 matching task
```

sẽ hữu ích hơn:

```text
128 visible tasks
```

---

## 11. Project cards vẫn quá lớn

Các card OrbitApp và Viettel sử dụng khá nhiều diện tích cho lượng thông tin tương đối ít.

Hiện một card chứa:

- Project label
- Title
- Description
- Counter
- Progress container
- Progress title
- Percentage
- Progress bar
- Completed / total
- Complete
- Add Task

Có thể compact:

```text
Viettel                              19 / 20
Thực tập khương lông                      95%
██████████████████████████████░

                                      + Add task
```

Giảm card khoảng 25–35% chiều cao sẽ làm dashboard gọn hơn đáng kể.

---

## 12. `Complete` project vẫn cần xem lại

Ví dụ:

```text
Viettel
19 / 20

[ Complete ] [ Add Task ]
```

Project vẫn còn một task chưa hoàn thành nhưng nút Complete đã available.

User có thể đặt câu hỏi:

> Complete project có bỏ qua task chưa xong không?

Ngoài ra:

> Project đã Complete thì có Add Task tiếp được không?

### Khuyến nghị

Giữ action chính:

```text
+ Add Task
```

Các action quản trị đưa vào:

```text
...
Edit project
Mark project completed
Archive
Delete
```

Nếu cho Complete khi còn incomplete task thì nên có confirm:

```text
This project still has 1 incomplete task.
Mark project as completed anyway?
```

---

## 13. `Show Completed Projects` nên rõ là filter của Project Focus

Control này đang ở cùng hàng với `Add Project`, khá hợp lý.

Nhưng vì toàn trang hiện còn một status filter ở header nên user có thể nhầm giữa:

- Status filter của task
- Show Completed Projects

Nên label cụ thể hơn hoặc visual group rõ hơn.

Ví dụ:

```text
Projects: [ Show completed ]
```

Hoặc dùng toggle:

```text
Show completed projects  [on/off]
```

---

## 14. Search và status filter đang ở quá xa nhau

Search nằm ngay trên task:

```text
Search tasks...
```

Status filter lại nằm tận top-right header.

Nếu status filter chủ yếu phục vụ task list, user phải scan hai vùng khác nhau để thao tác cùng một danh sách.

Task toolbar hợp lý hơn:

```text
[ Search tasks... ] [ Status ▾ ] [ Priority ▾ ] [ Project ▾ ] [ Sort ▾ ]
```

Khi active:

```text
[ Status: 2 selected × ]
```

User nhìn một lần là hiểu state hiện tại.

---

## 15. Nên có `Clear filters`

Khi dropdown hiển thị:

```text
2 statuses
```

nên có cách reset thật nhanh.

Ví dụ trong dropdown:

```text
Status

✓ Pending
✓ In Progress
  Completed
  Given Up

Clear all
```

Hoặc toolbar:

```text
2 filters active     Clear
```

Đây đặc biệt quan trọng khi user không hiểu vì sao project/task vừa “biến mất”.

---

## 16. Active filter cần phản ánh rõ hơn trên màn hình

`2 statuses` là tương đối tốt, nhưng user vẫn phải click để nhớ mình đã chọn gì.

Có thể hiển thị:

```text
Pending + In Progress
```

nếu chỉ chọn 2 trạng thái.

Hoặc:

```text
Status: Pending, In Progress
```

Nếu không đủ space mới fallback thành:

```text
2 statuses
```

Điều này giảm memory load.

---

## 17. Task status và checkbox vẫn chưa thật sự khớp

Task có khả năng mang các trạng thái:

- Pending
- In Progress
- Completed
- Given Up

nhưng UI vẫn sử dụng checkbox bên trái.

Checkbox convention:

```text
Unchecked = incomplete
Checked = completed
```

Workflow nhiều trạng thái lại phức tạp hơn.

Ví dụ một task `Given Up` sẽ có checkbox unchecked, nhưng nó không còn thực sự là một pending task.

### Hướng 1 — Đơn giản hóa

Task chỉ có:

```text
Incomplete
Completed
```

Còn `Give Up` là action/archive reason.

### Hướng 2 — Giữ workflow

Sử dụng status selector:

```text
○ Pending
◐ In Progress
✓ Completed
⊘ Given Up
```

Checkbox chỉ dùng cho complete shortcut nếu behavior được định nghĩa rõ.

---

## 18. Task row có thể compact hơn

Task hiện dùng khá nhiều vertical padding.

Có thể giảm còn:

```text
☐ Refactor lại lõi vật                         ✎  ⚑  ⋯
  OrbitApp · Study · High · Due today
```

Mục tiêu:

- 64–76px/task
- Hiển thị nhiều task hơn
- Dễ scan
- Giảm scroll

---

## 19. Action icons cần tooltip

Task hiện có các icon như:

- Edit
- Flag/Give up
- Delete

Các icon này không phải tất cả đều có meaning hoàn toàn obvious.

Cần tooltip:

```text
Edit task
Give up task
Delete task
```

Delete có thể đưa vào `...` menu để giảm accidental click và visual noise.

---

## 20. Badge hierarchy tương đối tốt nhưng có thể tinh chỉnh

Hiện badge:

```text
OrbitApp
Study
high
Due today
```

đã phân biệt bằng màu tương đối tốt.

Nên giữ hierarchy:

1. Task title
2. Due date
3. Priority
4. Project
5. Category

`Due today` có thể nổi hơn `Study` vì urgency có giá trị quyết định hành động cao hơn.

---

## 21. `Standalone` vẫn hơi technical

Tên:

```text
Standalone
```

mang tính implementation/system terminology.

Có thể thân thiện hơn:

- No Project
- Personal Tasks
- Unassigned

Ví dụ:

```text
No Project
Tasks that are not assigned to any project.
```

ngắn và trực tiếp hơn.

---

## 22. Empty state khi filter cần phân biệt với empty state thật

Đây là điểm rất đáng chú ý trong screenshot mới.

Hiện tại filter có thể khiến card hiển thị:

```text
No tasks in this project yet
```

Trong khi nguyên nhân thật sự là:

```text
No tasks match current filters
```

Hai empty state phải khác nhau.

### Empty project thật

```text
No tasks in this project yet.
+ Add your first task
```

### Không có kết quả do filter

```text
No tasks match the selected statuses.
Clear filters
```

Đây là microcopy rất quan trọng để tránh user hiểu sai dữ liệu.

---

## 23. Progress bar cần giữ meaning ổn định

Progress bar là metric mang tính “state of project”.

Nếu thay đổi chỉ vì filter UI thì user mất trust vào metric.

Ví dụ:

```text
Viettel 95%
```

sau một click filter trở thành:

```text
Viettel 0%
```

nhưng user không hề thay đổi task nào.

Điều này vi phạm kỳ vọng:

> Progress chỉ thay đổi khi trạng thái công việc thay đổi.

Vì vậy, **project progress không nên tính lại theo visibility filter**, trừ khi UI ghi rất rõ đây là filtered metric.

---

## 24. Floating Assistant

Assistant vẫn khá ổn về visual nhưng chiếm vùng bottom-right cố định.

Nên đảm bảo:

- Không che task action
- Không che bottom content
- Có safe-area
- Có thể collapse thành icon nhỏ

Ví dụ mặc định:

```text
🤖
```

Hover/click:

```text
Assistant
Chat or generate tasks
```

---

## 25. Accessibility

Cần kiểm tra:

- Contrast secondary text
- Focus state của dropdown filter
- Keyboard navigation trong multi-select status
- Hit area của icon buttons
- Screen reader label cho icon-only controls
- Không dùng màu là tín hiệu duy nhất

Status filter nên hỗ trợ keyboard:

```text
Tab
Enter/Space
Arrow keys
Esc
```

---

## 26. Responsive

Ở desktop hiện tại layout còn rộng.

Nhưng khi xuống laptop/tablet:

- Project cards sẽ chiếm nhiều chiều cao
- Header filter và avatar có thể squeeze
- Search và task list càng bị đẩy xuống

Khuyến nghị:

### Desktop

- 3-column compact project summary
- Task toolbar full width

### Tablet

- 2-column project cards

### Mobile

- Task list lên đầu
- Project summary collapse
- Filter nằm trong task toolbar
- Floating Assistant thu gọn

---

## 27. Information duplication

Vẫn có các thông tin gần giống nhau:

```text
111 completed
128 visible tasks

111 / 128

Overall completion
87%

111 completed · 128 total tasks
```

Nên giảm còn một summary chính.

Ví dụ:

```text
17 remaining · 87% completed
```

Project cards tự hiển thị progress riêng.

---

## 28. Layout đề xuất sau khi có status filter mới

```text
Today
Sunday, August 16

3 tasks remaining                              + Add Task

[ Search tasks... ] [ Status: 2 selected ▾ ] [ Project ▾ ] [ Sort ▾ ]

Pending, In Progress                                  Clear

────────────────────────────────────────────────────

TODAY

☐ Refactor lại lõi vật
  OrbitApp · Study · High · Due today

────────────────────────────────────────────────────

PROJECTS                                         View all

OrbitApp
0 / 1 · 0%
████░░░░░░

Viettel
19 / 20 · 95%
█████████░

No Project
38 / 46 · 83%
████████░░
```

Quan trọng:

> Status filter chỉ lọc danh sách task. Project progress vẫn phản ánh toàn bộ project.

---

## 29. Thứ tự ưu tiên cải thiện

### P0 — Tách project progress khỏi task visibility filter

Không để:

```text
95% → 0%
```

chỉ vì user thay status filter.

### P0 — Phân biệt filtered empty state và real empty state

Không dùng:

```text
No tasks in this project yet
```

khi task chỉ bị filter ẩn đi.

### P0/P1 — Làm rõ task status model

Giải quyết semantic giữa:

- Checkbox
- Pending
- In Progress
- Completed
- Given Up

### P1 — Đưa task lên trên Project Focus

Đây vẫn là thay đổi có impact lớn nhất đối với Today page.

### P1 — Gom Search + Status Filter + Sort

Nếu status filter chủ yếu phục vụ task list.

### P1 — Compact project/task cards

Tăng information density.

### P1 — Giảm duplication

Giữ một summary chính.

### P2 — Polish visual

Sau khi UX core ổn mới tiếp tục tối ưu:

- Typography
- Tooltip
- Hover
- Focus
- Empty states
- Animation
- Responsive

---

## 30. Kết luận

Việc thay `Only show in-progress` thành **status filter đa lựa chọn** là một bước cải thiện đúng hướng. Vấn đề duplicate filtering trước đây về cơ bản đã được giải quyết.

Tuy nhiên, phiên bản mới làm lộ ra một vấn đề quan trọng hơn:

> **Status filter đang có vẻ làm thay đổi cả project metrics, khiến progress và empty state không còn phản ánh trạng thái thật của project.**

Đây là phần nên sửa tiếp theo.

Thiết kế hợp lý nhất với màn hình hiện tại là:

1. Status filter dùng để lọc **task list**
2. Project progress luôn phản ánh **toàn bộ task của project**
3. Search + Status + Sort nằm cùng một task toolbar
4. Task của Today được đưa lên trước Project Focus
5. Empty state phân biệt rõ `không có dữ liệu` và `không có dữ liệu phù hợp filter`

Sau các thay đổi này, hierarchy và mental model của màn hình sẽ rõ ràng hơn đáng kể mà không cần thay đổi design language hiện tại.
