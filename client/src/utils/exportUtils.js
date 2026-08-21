/**
 * Utility functions for exporting reports to Text, Markdown, and Styled Printable PDF
 */

export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function printOrSaveAsPDF(title, htmlContent) {
  const printWindow = window.open('', '_blank', 'width=850,height=900')
  if (!printWindow) {
    alert('Please allow popups to download or print your PDF report.')
    return
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
          
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
            color: #111827;
            background: #ffffff;
            padding: 40px;
            line-height: 1.6;
            font-size: 13px;
          }
          .header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 18px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .brand {
            font-size: 20px;
            font-weight: 800;
            color: #111827;
          }
          .brand span {
            color: #059669;
          }
          .report-title {
            font-size: 18px;
            font-weight: 700;
            margin-top: 4px;
            color: #1f2937;
          }
          .meta {
            font-size: 11px;
            color: #6b7280;
            font-family: 'JetBrains Mono', monospace;
          }
          .score-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            display: flex;
            gap: 20px;
          }
          .score-badge {
            font-size: 32px;
            font-weight: 800;
            color: #059669;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #111827;
            margin-top: 20px;
            margin-bottom: 8px;
            border-left: 3px solid #059669;
            padding-left: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 10px;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            background: #ecfdf5;
            color: #065f46;
            margin-right: 6px;
            margin-bottom: 6px;
          }
          ul {
            padding-left: 20px;
            margin-bottom: 12px;
          }
          li {
            margin-bottom: 4px;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #e5e7eb;
            padding-top: 12px;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
            @page { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">Career<span>Hub</span> AI</div>
            <div class="report-title">${title}</div>
          </div>
          <div class="meta">
            Generated on ${new Date().toLocaleDateString()}<br />
            Confidential Career Report
          </div>
        </div>
        <div class="content">
          ${htmlContent}
        </div>
        <div class="footer">
          Generated automatically by CareerHub AI Career Platform • www.careerhub.com
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
