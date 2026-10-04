# Blog Response

A bookmarklet that reports the response to the latest braff.co blog email from GoDaddy Websites + Marketing: sent, bounced, delivered, opened, clicked, unsubscribed, with the contact lists and a CSV download.

GoDaddy's campaign report view is unreliable and there is no public API, so the bookmarklet runs on the GoDaddy **Customers** page in your logged-in browser, pages through the contact list, and reads each contact's latest activity. It detects the most recent send as the latest timestamp shared by many "Email sent" entries.

## Use
1. Open https://adambraff.github.io/tools/blog-response/ and drag the button to the bookmarks bar.
2. A day or two after a post, click the bookmark on the Customers page. Keep the tab in front for about 30 seconds.

Source: `scan.js`. Client-side only, no dependencies.
