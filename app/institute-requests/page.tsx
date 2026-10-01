  function handlePrintRequests() {
    if (filteredRequests.length === 0) {
      alert("لا توجد طلبات لطباعتها.");
      return;
    }

    const instituteName =
      instituteFilter === "all"
        ? "كل المعاهد"
        : institutes.find(
            (item) => item.id === instituteFilter
          )?.name ?? "المعهد المحدد";

    const printStats = {
      total: filteredRequests.length,
      newCount: filteredRequests.filter(
        (r) => r.status === "new"
      ).length,
      inProgress: filteredRequests.filter(
        (r) => r.status === "in_progress"
      ).length,
      needsDirector: filteredRequests.filter(
        (r) => r.status === "needs_director_action"
      ).length,
      overdue: filteredRequests.filter(
        (r) => isOverdue(r)
      ).length,
      resolved: filteredRequests.filter(
        (r) =>
          r.status === "resolved" ||
          r.status === "closed"
      ).length,
    };

    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const filterDetails = [
      pendingFilter ? "الطلبات المعلقة فقط" : "",
      needsActionFilter ? "الطلبات التي تحتاج إجراء من المدير" : "",
      statusFilter !== "all"
        ? `الحالة: ${statusLabel(statusFilter)}`
        : "",
      priorityFilter !== "all"
        ? `الأولوية: ${priorityLabel(priorityFilter)}`
        : "",
      searchTerm.trim()
        ? `كلمة البحث: ${searchTerm.trim()}`
        : "",
    ].filter(Boolean);

    const rows = filteredRequests
      .map(
        (request, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="title-cell">${escapeHtml(request.title)}</td>
            <td>${escapeHtml(request.institute?.name ?? "غير محدد")}</td>
            <td>${escapeHtml(typeLabel(request.request_type))}</td>
            <td>${escapeHtml(priorityLabel(request.priority))}</td>
            <td>
              ${escapeHtml(statusLabel(request.status))}
              ${
                isOverdue(request)
                  ? '<span class="overdue"> - متأخر</span>'
                  : ""
              }
            </td>
            <td>${escapeHtml(formatDateTime(request.created_at))}</td>
            <td>${escapeHtml(formatDate(request.due_date))}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

    if (!printWindow) {
      alert(
        "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة في المتصفح."
      );
      return;
    }

    const printDate = new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>تقرير طلبات المعاهد</title>

        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            direction: rtl;
            font-family: Arial, Tahoma, sans-serif;
            color: #1e293b;
            background: #fff;
            margin: 0;
            font-size: 12px;
          }

          .header {
            text-align: center;
            border-bottom: 3px solid #4338ca;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }

          .header h1 {
            font-size: 21px;
            margin: 0 0 8px;
            color: #1e1b4b;
          }

          .header h2 {
            font-size: 16px;
            margin: 0;
            color: #4338ca;
          }

          .meta {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin: 15px 0;
            padding: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
          }

          .filters {
            margin: 10px 0 16px;
            color: #475569;
            line-height: 1.8;
          }

          .stats {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 8px;
            margin: 15px 0 20px;
          }

          .stat {
            border: 1px solid #cbd5e1;
            border-radius: 7px;
            padding: 10px 5px;
            text-align: center;
            background: #f8fafc;
          }

          .stat strong {
            display: block;
            font-size: 20px;
            margin-top: 5px;
            color: #312e81;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }

          thead {
            display: table-header-group;
          }

          th {
            background: #312e81;
            color: white;
            font-weight: bold;
            padding: 10px 6px;
            border: 1px solid #312e81;
          }

          td {
            border: 1px solid #cbd5e1;
            padding: 9px 6px;
            text-align: center;
            vertical-align: middle;
            overflow-wrap: anywhere;
            line-height: 1.6;
          }

          tbody tr:nth-child(even) {
            background: #f8fafc;
          }

          .title-cell {
            text-align: right;
            font-weight: bold;
          }

          .overdue {
            color: #dc2626;
            font-weight: bold;
          }

          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            color: #64748b;
            font-size: 10px;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            tr {
              break-inside: avoid;
            }
          }
        </style>
      </head>

      <body>
        <div class="header">
          <h1>نظام إدارة المعاهد الأزهرية</h1>
          <h2>تقرير طلبات المعاهد</h2>
        </div>

        <div class="meta">
          <span><strong>المعهد:</strong> ${escapeHtml(instituteName)}</span>
          <span><strong>عدد الطلبات المعروضة:</strong> ${printStats.total}</span>
          <span><strong>تاريخ الطباعة:</strong> ${escapeHtml(printDate)}</span>
        </div>

        ${
          filterDetails.length
            ? `
              <div class="filters">
                <strong>الفلاتر المطبقة:</strong>
                ${filterDetails.map(escapeHtml).join(" | ")}
              </div>
            `
            : ""
        }

        <div class="stats">
          <div class="stat">إجمالي الطلبات<strong>${printStats.total}</strong></div>
          <div class="stat">جديدة<strong>${printStats.newCount}</strong></div>
          <div class="stat">قيد المعالجة<strong>${printStats.inProgress}</strong></div>
          <div class="stat">تحتاج تدخل المدير<strong>${printStats.needsDirector}</strong></div>
          <div class="stat">متأخرة<strong>${printStats.overdue}</strong></div>
          <div class="stat">تم الحل / مغلقة<strong>${printStats.resolved}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:4%">م</th>
              <th style="width:19%">عنوان الطلب</th>
              <th style="width:16%">المعهد</th>
              <th style="width:9%">نوع الطلب</th>
              <th style="width:8%">الأولوية</th>
              <th style="width:12%">الحالة</th>
              <th style="width:16%">تاريخ الإنشاء</th>
              <th style="width:16%">تاريخ المتابعة</th>
            </tr>
          </thead>

          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="footer">
          <span>منصة الإدارة والمتابعة التعليمية الأزهرية</span>
          <span>تقرير صادر من نظام إدارة المعاهد الأزهرية</span>
        </div>

        <script>
          window.onload = function () {
            window.focus();
            setTimeout(function () {
              window.print();
            }, 400);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }
