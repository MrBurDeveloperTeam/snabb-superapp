import { APP_CONFIG } from "./config/apps.js";
import { parseJwtPayload, extractEmail } from "./auth/odooJWT.js";
import { getProfileByEmail } from "./supabase/profiles.js";
import { getInventoryMetaByUserId } from "./supabase/inventoryMeta.js";
import { supabaseBootstrapByEmail } from "./supabase/bootstrap.js";
import { inventoryFullSync } from "./supabase/inventorySync.js";
import { getAppointments, updateAppointment, deleteAppointment, createAppointment } from "./supabase/appointments.js";
import {searchPatients, createPatient, getPatients, updatePatient, deletePatient} from "./supabase/patients.js";
import { getStaff, createStaff, updateStaff, deleteStaff } from "./supabase/staff.js";
import { getRooms, createRoom, updateRoom, deleteRoom } from "./supabase/rooms.js";
import { getTreatments, createTreatment, updateTreatment, deleteTreatment } from "./supabase/treatments.js";
import { getSettings, saveSettings } from "./supabase/settings.js";
import { getHolidays, addHoliday, updateHoliday, deleteHoliday } from "./supabase/holidays.js";
import { getActivity, addActivity } from "./supabase/activity.js";
import { handleWhiteboardApi } from "./supabase/whiteboard.js";
import { handleTasksApi } from "./supabase/tasks.js"; 
import { getRequests, updateRequest } from "./supabase/requests.js";
import { getClinics, getClinicById, addClinic, updateClinic, deleteClinic } from "./supabase/clinics.js";
import { getProfiles, getProfileById, updateProfile } from "./supabase/apt_profiles.js";
import { handleHiringApi } from "./supabase/hiring.js";
import { getCollaboratorsByUserId } from "./supabase/collaborators.js";
import { getLatestProfileByUserId } from "./supabase/profiles-bootstrap.js";
import { getRoomsWithItemsByUserId, updateRoomPosition } from "./supabase/inventoryRooms.js";
import { handleCreateAuthUser } from "./supabase/handleCreateAuthUser.js";
import { getCompanyIdFromRequest } from "./helper/getCompanyIdFromRequest.js";
import { handleElearningApi } from "./supabase/elearning.js";
import { acceptCompanyInvitation, createCompanyInvitation, getCompanyInvitation, listCompanyPeople, updateCompanyMemberRole, removeCompanyMember, searchIndividualProfiles, addExistingCompanyMember,} from "./supabase/companyInvitations.js";
import { resolveWorkspaceContext } from "./supabase/companyWorkspace.js";
import {getEffectiveAccess,getCompanyAccessMatrix,saveCompanyRolePermissions,requirePermission,} from "./supabase/companyAccessControl.js";
/* =========================================================
      🔥 CONFIG
========================================================= */

const PUBLIC_EVENT_HOST = "event.snabbb.com";
const ODOO_EVENT_HOST = "mrbur.odoo.com";
const ODOO_EVENT_BASE = "/event";
const ODOO_SHOP_BASE = "/shop";
const ODOO_DEV_HOST = "mrbur.odoo.com"
const ODOO_DEV_BASE = "https://mrbur.odoo.com"
// const ODOO_DEV_HOST = "aht-systemadmin-mrbur-main-20994444.dev.odoo.com";
// const ODOO_DEV_BASE = `https://${ODOO_DEV_HOST}`;
const PUBLIC_SHOP_HOST = "mrbur.shop";
const ODOO_SHOP_HOST = "mrbur.odoo.com";
const ODOO_ACTIVITY_URL = "https://mrbur.odoo.com/snabbb/api/inventory/activity";
const ODOO_TODO_ACTIVITY_URL = 'https://mrbur.odoo.com/snabbb/api/todo/activity';
const ODOO_APPOINTMENT_ACTIVITY_URL =
  "https://mrbur.odoo.com/snabbb/api/appointment/activity";
const ODOO_ELEARNING_ACTIVITY_URL = "https://mrbur.odoo.com/snabbb/api/elearning/activity";
const INVENTORY_ACTIVITY_ACTIONS = new Set([
    "add", "remove", "delete", "transfer_out", "transfer_in", "edit", "receive", "page_view", "session_end"
]);
const ODOO_CALCULATOR_ACTIVITY_URL = 'https://mrbur.odoo.com/snabbb/api/calculator/activity';
const COUNTRY_SHOP_DOMAIN_MAP = {
    MY: "https://my.mrbur.shop",
    SG: "https://sg.mrbur.shop",
    TH: "https://th.mrbur.shop",
    ID: "https://id.mrbur.shop",
    PH: "https://ph.mrbur.shop",
    VN: "https://vn.mrbur.shop",
    KR: "https://kr.mrbur.shop",
    JP: "https://jp.mrbur.shop",
    AU: "https://au.mrbur.shop",
    GB: "https://uk.mrbur.shop",
    US: "https://us.mrbur.shop",
    CA: "https://ca.mrbur.shop",
    AE: "https://ae.mrbur.shop",
    SA: "https://sa.mrbur.shop",
    NZ: "https://nz.mrbur.shop",
};

const CHECKOUT_API_PATHS = new Set([
  '/api/unified-shop/checkout/state',
  '/api/unified-shop/checkout/countries',
  '/api/unified-shop/checkout/states',
  '/api/unified-shop/checkout/address',
  '/api/unified-shop/checkout/delivery-method',
  '/api/unified-shop/checkout/credit-toggle',
  '/api/unified-shop/checkout/reward-claim',
  '/api/unified-shop/checkout/confirm',
  '/api/unified-shop/checkout/payment/methods',
  '/api/unified-shop/checkout/payment/init',
  '/api/unified-shop/checkout/payment/status',
]);
 
// EU-27 (post-Brexit) all share the eu.mrbur.shop storefront.
const COUNTRY_SHOP_DOMAIN_EU = new Set([
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
    "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
    "RO", "SK", "SI", "ES", "SE",
]);

const TICKETING_HOSTS = new Set([
  'app.snabbb.com',
  'appointment.snabbb.com',
  'calculator.snabbb.com',
  'inventory.snabbb.com',
  'e-learning.snabbb.com',
]);

// ✅ FIX (Indonesia blank shop page): Odoo's res.company.x_company_code for
// Indonesia is "MIN" (see mrbur_config_additional/models/web_session.py and
// mrbur_snabb_ic module comments), but every company-code -> shop-origin map
// in this file was only keyed by "MID"/"ID". When the country-first lookup
// (getUserCountryShopOrigin) fails to resolve in time, the code fell back to
// these maps, got undefined for "MIN", and defaulted to the bare
// mrbur.odoo.com host instead of id.mrbur.shop -- producing a blank page for
// Indonesian users only. Same bug class already patched once for the
// reward/wallet API via WEBSITE_SCOPE_CORRECTIONS below; centralizing the
// shop-side correction here so any future company/ISO code mismatch only
// needs to be added in one place.
const COMPANY_CODE_TO_SHOP_CODE = { MIN: "ID" };

function normalizeShopCompanyCode(code) {
    const upper = String(code || "").trim().toUpperCase();
    return COMPANY_CODE_TO_SHOP_CODE[upper] || upper;
}

// ✅ FIX (blank/stuck "about:blank" tab on mobile): App.Snabbb's app-tile
// click handler opens a blank tab synchronously (window.open("","_blank"),
// which keeps it popup-blocker-safe), then asynchronously fetches the real
// destination URL from this Worker's /api/v1/sso/app_link and sets the new
// tab's location once that resolves. That endpoint calls
// getUserCountryShopOrigin(), which previously made up to 3 *sequential*
// plain fetch() calls to mrbur.odoo.com with no timeout. Plain fetch() can
// hang indefinitely if a response never arrives (common on flaky/slow
// mobile connections) -- and because nothing ever throws in that case, the
// surrounding try/catch never fires, the app_link response never comes
// back, and the blank tab just sits at about:blank forever with no visible
// error. Wrapping every upstream fetch in this chain with a hard timeout
// means the worst case is now "resolves within N seconds" instead of
// "may never resolve", so the frontend's blank tab reliably gets *some*
// destination (even if it's just the generic fallback) instead of hanging.
async function fetchWithTimeout(input, init = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function getUserCountryShopOrigin(request) {
    try {
        const cookieHeader = request.headers.get("Cookie") || "";
        const sessionMatch = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/i);
        if (!sessionMatch) return null;
        const sessionId = sessionMatch[1];

        const sessionRes = await fetchWithTimeout("https://mrbur.odoo.com/web/session/get_session_info", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Cookie": `session_id=${sessionId}` },
            body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
        }, 4000);
        const sessionData = await sessionRes.json().catch(() => null);
        const rawPartnerId = sessionData?.result?.partner_id;
        const partnerId = Array.isArray(rawPartnerId) ? rawPartnerId[0] : rawPartnerId;
        if (!partnerId) return null;

        // Read country_id (many2one -> [id, display_name]) off the partner,
        // then resolve its ISO code in the same round trip's follow-up call.
        const partnerRes = await fetchWithTimeout("https://mrbur.odoo.com/web/dataset/call_kw", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Cookie": `session_id=${sessionId}` },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                id: 1,
                params: {
                    model: "res.partner",
                    method: "read",
                    args: [[partnerId]],
                    kwargs: { fields: ["country_id"] },
                },
            }),
        }, 4000);
        const partnerData = await partnerRes.json().catch(() => null);
        const countryField = partnerData?.result?.[0]?.country_id;
        const countryId = Array.isArray(countryField) ? countryField[0] : null;
        if (!countryId) return null;

        const countryRes = await fetchWithTimeout("https://mrbur.odoo.com/web/dataset/call_kw", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Cookie": `session_id=${sessionId}` },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                id: 1,
                params: {
                    model: "res.country",
                    method: "read",
                    args: [[countryId]],
                    kwargs: { fields: ["code"] },
                },
            }),
        }, 4000);
        const countryData = await countryRes.json().catch(() => null);
        const code = (countryData?.result?.[0]?.code || "").toUpperCase();
        if (!code) return null;

        if (COUNTRY_SHOP_DOMAIN_EU.has(code)) return "https://eu.mrbur.shop";
        return COUNTRY_SHOP_DOMAIN_MAP[code] || "https://www.mrbur.shop";
    } catch (e) {
        console.log("[shop-proxy] country lookup failed:", e?.message || String(e));
        return null;
    }
}

// =====================================================
// Shared app-launch redirect logic, extracted so it can be called from
// whatever literal path is actually proven bound to this Worker in
// Cloudflare's routing config (verified via live network trace -- see
// call sites below for what's confirmed vs. what silently falls through
// to the Cloudflare Pages SPA instead of ever reaching this script).
// Resolves session -> Odoo app_link -> country-aware company_code, and
// returns a normal HTTP 302 Response. Never throws -- always resolves to
// either the real destination or the gallery fallback.
// =====================================================
async function handleAppLaunchRedirect(request, env, appCode) {
    const fallbackUrl = "https://app.snabbb.com/";
    const redirectTo = (location) => new Response(null, {
        status: 302,
        headers: { Location: location, "Cache-Control": "no-store" },
    });

    if (!appCode) return redirectTo(fallbackUrl);

    const launchCookieHeader = request.headers.get("Cookie") || "";
    const launchSessionMatch = launchCookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/i);
    if (!launchSessionMatch) {
        // Not logged in -- bounce back to the gallery instead of
        // opening a tab that can never resolve.
        return redirectTo(fallbackUrl);
    }
    const launchSessionId = launchSessionMatch[1];

    try {
        // 1) Who is this? Odoo's app_link call needs an email/name.
        const launchSessionRes = await fetchWithTimeout(
            "https://mrbur.odoo.com/web/session/get_session_info",
            {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: `session_id=${launchSessionId}` },
                body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
            },
            4000
        );
        const launchSessionData = await launchSessionRes.json().catch(() => null);
        const launchSessionInfo = launchSessionData?.result || null;
        const launchEmail = launchSessionInfo?.username || launchSessionInfo?.email || "";
        const launchName = launchSessionInfo?.name || launchSessionInfo?.partner_display_name || "";

        if (!launchEmail) return redirectTo(fallbackUrl);

        // 2) Ask Odoo for the SSO launch link (same call
        // /api/v1/sso/app_link makes).
        const launchAppLinkRes = await fetchWithTimeout(
            "https://mrbur.odoo.com/api/v1/sso/app_link",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: { app_code: appCode, email: launchEmail, name: launchName },
                }),
            },
            6000
        );
        const launchAppLinkJson = await launchAppLinkRes.json().catch(() => null);

        if (!launchAppLinkRes.ok || !launchAppLinkJson?.result?.url) {
            return redirectTo(fallbackUrl);
        }

        let launchFinalUrl = String(launchAppLinkJson.result.url || "")
            .replace(/https:\/\/sso\.mrburstudio\.com/gi, "https://sso.snabbb.com");

        // 3) Same company_code resolution as /api/v1/sso/app_link:
        // prefer the visitor's actual saved country over whatever
        // "current company" the backend ERP session happens to be
        // on (almost always MMY).
        const launchCompanyCodes = launchSessionInfo?.company_codes || {};
        const launchDefaultCompanyId =
            launchSessionInfo?.company_id?.[0] || launchSessionInfo?.company_id || null;

        let launchPrimaryCompany = null;
        if (launchDefaultCompanyId && launchCompanyCodes[String(launchDefaultCompanyId)]) {
            launchPrimaryCompany = {
                companyId: String(launchDefaultCompanyId),
                companyCode: String(launchCompanyCodes[String(launchDefaultCompanyId)] || "").trim().toUpperCase(),
            };
        } else {
            const launchEntries = Object.entries(launchCompanyCodes);
            if (launchEntries.length) {
                const [launchCompanyId, launchCompanyCode] = launchEntries[0];
                launchPrimaryCompany = {
                    companyId: String(launchCompanyId),
                    companyCode: String(launchCompanyCode || "").trim().toUpperCase(),
                };
            }
        }

        const launchCountryOrigin = await getUserCountryShopOrigin(request);
        if (launchCountryOrigin) {
            const launchCountrySub = new URL(launchCountryOrigin).hostname.split(".")[0].toUpperCase();
            if (launchPrimaryCompany) {
                launchPrimaryCompany.companyCode = launchCountrySub;
            } else {
                launchPrimaryCompany = { companyCode: launchCountrySub, companyId: "2" };
            }
        }

        if (launchPrimaryCompany) {
            const launchSsoUrl = new URL(launchFinalUrl);
            launchSsoUrl.searchParams.set("company_code", launchPrimaryCompany.companyCode);
            launchSsoUrl.searchParams.set("company_id", launchPrimaryCompany.companyId);
            launchFinalUrl = launchSsoUrl.toString();
        }

        // ✅ Shop (Mr.Bur) specifically: route through the existing
        // /api/sso/odoo-exchange handler instead of the generic
        // /sso/login path, to exactly match the redirect chain the
        // frontend's AppCard.tsx "mrbur.shop" case was already using
        // (extract token + company_code, hit odoo-exchange, which
        // does its own country-first lookup and lands on
        // {subdomain}.mrbur.shop/sso/token). This keeps behavior
        // identical to what was already working, just without the
        // "open blank tab, fetch, then relocate it" step in front.
        if (appCode === "shop") {
            try {
                const shopSsoUrl = new URL(launchFinalUrl);
                const shopToken = shopSsoUrl.searchParams.get("token");
                const shopCompanyCode = shopSsoUrl.searchParams.get("company_code") || "INT";
                if (shopToken) {
                    const exchangeUrl = new URL("https://app.snabbb.com/api/sso/odoo-exchange");
                    exchangeUrl.searchParams.set("token", shopToken);
                    exchangeUrl.searchParams.set("company_code", shopCompanyCode);
                    launchFinalUrl = exchangeUrl.toString();
                }
            } catch (e) {
                console.log("[launch] shop odoo-exchange rewrite failed:", e?.message || String(e));
            }
        }

        const launchOut = redirectTo(launchFinalUrl);
        if (launchSessionId) {
            launchOut.headers.append(
                "Set-Cookie",
                `session_id=${launchSessionId}; Path=/; Domain=.snabbb.com; HttpOnly; Secure; SameSite=None; Max-Age=21600`
            );
        }
        return launchOut;
    } catch (e) {
        console.log("[launch] failed:", e?.message || String(e));
        return redirectTo(fallbackUrl);
    }
}

/* ===================== Snabbb credit local testing ============================ */
const ODOO_BASE_URL='https://aht-systemadmin-mrbur-main-20994444.odoo.com'
const SNABBB_API_KEY='UiFKcg6lJvSHZUuQFJxg0oDjjIm8QCON'

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // =====================================================
        // App-launch redirect: /api/sso/launch/:appCode
        // NOT CONFIRMED reachable in production -- Cloudflare's route
        // binding for this Worker appears to be an explicit list of exact
        // literal paths, not a wildcard on /api/sso/*. Live network trace
        // showed `GET /api/sso/launch/shop -> 200` (Cloudflare Pages' SPA
        // shell, not this script's 302), even though sibling literal paths
        // like /api/sso/exchange are confirmed bound. Kept here in case the
        // Cloudflare route config is ever broadened to cover this prefix,
        // but the frontend currently calls the guaranteed-reachable
        // /api/v1/sso/app_link GET variant below instead -- see that block.
        // =====================================================
        if (url.pathname.startsWith("/api/sso/launch/")) {
            const appCode = decodeURIComponent(url.pathname.slice("/api/sso/launch/".length).split("/")[0] || "").trim();
            return await handleAppLaunchRedirect(request, env, appCode);
        }

        // =====================================================
        // ✅ SNABBB REWARD API PROXY — MUST STAY BEFORE OLD ROUTES
        // Handles /api/reward/redeem, /api/reward/rewards, /api/reward/my, /api/reward/image/<id>, /api/wallet
        // =====================================================
        // FINAL Snabbb Reward Worker proxy fix
        // Paste this block as the FIRST reward route inside Cloudflare Worker fetch(request, env)
        // right after: const url = new URL(request.url)
        // IMPORTANT: remove/comment any older blocks that also handle /api/reward/redeem.

        if (url.pathname === '/api/reward/redeem' ||
                url.pathname === '/api/reward/rewards' ||
                url.pathname === '/api/reward/my' ||
                url.pathname.startsWith('/api/reward/image/') ||
                url.pathname === '/api/wallet' ||
                url.pathname === '/api/wallet/my') {

            const allowedOrigins = new Set([
                'https://reward.snabbb.com',
                'https://app.snabbb.com',
                'https://imageai.snabbb.com',
                'https://charting.snabbb.com/',
                'http://localhost:3000',
                'http://localhost:5173',
            ]);

            const origin = request.headers.get('Origin') || '';
            const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://reward.snabbb.com';
            const corsHeaders = {
                'Access-Control-Allow-Origin': allowOrigin,
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With, X-Snabbb-Api-Key',
                'Access-Control-Max-Age': '86400',
                'Vary': 'Origin',
                'X-Snabbb-Worker-Fix': 'redeem-forward-email-v2',
            };

            if (request.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: corsHeaders });
            }

            const ODOO_BASE = (env.ODOO_REWARD_API_BASE || 'https://mrbur.odoo.com/snabbb/reward/api').replace(/\/+$/, '');
            const API_KEY = env.SNABBB_REWARD_API_KEY || url.searchParams.get('api_key') || '';

            const decodeRepeated = (value) => {
                let out = String(value || '').trim();
                for (let i = 0; i < 4; i += 1) {
                    try {
                        const decoded = decodeURIComponent(out);
                        if (decoded === out) break;
                        out = decoded;
                    } catch (_e) { break; }
                }
                return out.trim();
            };

            const json = (data, status = 200) => new Response(JSON.stringify(data), {
                status,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders },
            });

            const readBody = async () => {
                const out = {};
                for (const [k, v] of url.searchParams.entries()) out[k] = v;

                if (request.method === 'POST') {
                    const contentType = request.headers.get('Content-Type') || '';
                    const raw = await request.clone().text().catch(() => '');
                    if (raw) {
                        if (contentType.includes('application/json')) {
                            try {
                                const parsed = JSON.parse(raw);
                                if (parsed && typeof parsed === 'object') Object.assign(out, parsed);
                            } catch (_e) {}
                        } else {
                            try {
                                for (const [k, v] of new URLSearchParams(raw).entries()) out[k] = v;
                            } catch (_e) {}
                        }
                    }
                }
                return out;
            };

            const callOdoo = async (path, method, payload = {}) => {
                const odooUrl = new URL(ODOO_BASE + path);

                // Put values in BOTH query and body so Odoo receives them even if one parser path fails.
                for (const [k, v] of Object.entries(payload)) {
                    if (v !== undefined && v !== null && v !== '') odooUrl.searchParams.set(k, String(v));
                }
                if (API_KEY) odooUrl.searchParams.set('api_key', API_KEY);

                const res = await fetch(odooUrl.toString(), {
                    method,
                    headers: {
                        'Accept': 'application/json',
                        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
                        ...(API_KEY ? { 'X-Snabbb-Api-Key': API_KEY, 'Authorization': `Bearer ${API_KEY}` } : {}),
                    },
                    ...(method === 'POST' ? { body: JSON.stringify({ ...payload, ...(API_KEY ? { api_key: API_KEY } : {}) }) } : {}),
                });

                const text = await res.text();
                let body;
                try { body = text ? JSON.parse(text) : {}; } catch (_e) { body = { ok: false, raw: text }; }
                return { res, body, url: odooUrl };
            };

            try {
                // Reward image proxy endpoint. Return raw image bytes, not JSON.
                if (url.pathname.startsWith('/api/reward/image/')) {
                    const imageId = url.pathname.split('/').pop();
                    const imageUrl = new URL(ODOO_BASE + '/image/' + encodeURIComponent(imageId));
                    if (API_KEY) imageUrl.searchParams.set('api_key', API_KEY);

                    const imageRes = await fetch(imageUrl.toString(), {
                        method: 'GET',
                        headers: {
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                            ...(API_KEY ? { 'X-Snabbb-Api-Key': API_KEY, 'Authorization': `Bearer ${API_KEY}` } : {}),
                        },
                    });

                    const outHeaders = new Headers(corsHeaders);
                    outHeaders.set('Content-Type', imageRes.headers.get('Content-Type') || 'image/png');
                    outHeaders.set('Cache-Control', imageRes.ok ? 'public, max-age=3600' : 'no-store');
                    outHeaders.set('X-Snabbb-Worker-Fix', 'reward-image-proxy-v1');

                    return new Response(imageRes.body, {
                        status: imageRes.status >= 200 && imageRes.status <= 599 ? imageRes.status : 502,
                        headers: outHeaders,
                    });
                }

                // Simple proxy endpoints
                if (url.pathname !== '/api/reward/redeem') {
                    const payload = await readBody();
                    payload.email = decodeRepeated(payload.email || '');
                    payload.website_scope = payload.website_scope || payload.website_domain || 'MMY';
                    payload.website_domain = payload.website_domain || payload.website_scope;

                    const pathMap = {
                        '/api/reward/rewards': '/rewards',
                        '/api/reward/my': '/my',
                        '/api/wallet': '/wallet/my',
                        '/api/wallet/my': '/wallet/my',
                    };
                    const upstream = await callOdoo(pathMap[url.pathname], 'GET', payload);
                    return json(upstream.body, upstream.res.status);
                }

                // Redeem endpoint
                const payload = await readBody();
                payload.email = decodeRepeated(payload.email || payload.user_email || payload.customer_email || payload.partner_email || '');
                payload.reward_code = payload.reward_code || payload.code || payload.rewardCode || payload.program_code || payload.reward_id || '';
                payload.website_scope = payload.website_scope || payload.website_domain || 'MMY';
                payload.website_domain = payload.website_domain || payload.website_scope;
                payload.external_ref = payload.external_ref || `reward-worker-${Date.now()}-${crypto.randomUUID()}`;

                if (!payload.email || !payload.reward_code) {
                    return json({
                        ok: false,
                        error: 'worker_missing_email_or_reward_code',
                        message: 'The Worker did not receive email or reward_code from the frontend.',
                        received_keys: Object.keys(payload),
                        email_seen_by_worker: payload.email || '',
                        reward_code_seen_by_worker: payload.reward_code || '',
                    }, 400);
                }

                // Get partner_id from the working wallet endpoint first.
                const wallet = await callOdoo('/wallet/my', 'GET', {
                    email: payload.email,
                    website_scope: payload.website_scope,
                    website_domain: payload.website_domain,
                });
                const walletData = wallet.body?.data || wallet.body?.wallet || wallet.body?.result?.data || wallet.body?.result || {};
                if (walletData.partner_id) payload.partner_id = String(walletData.partner_id);

                const redeemed = await callOdoo('/redeem2', 'POST', payload);

                // Add safe worker debug if Odoo still rejects it. This proves whether this new Worker route is active.
                if (!redeemed.body?.ok) {
                    redeemed.body = {
                        ...redeemed.body,
                        worker_debug: {
                            active_worker_fix: 'redeem-forward-email-v2',
                            email_forwarded_to_odoo: payload.email,
                            reward_code_forwarded_to_odoo: payload.reward_code,
                            website_scope_forwarded_to_odoo: payload.website_scope,
                            partner_id_forwarded_to_odoo: payload.partner_id || '',
                            wallet_status: wallet.res.status,
                            wallet_ok: !!wallet.body?.ok,
                            wallet_partner_id: walletData.partner_id || '',
                            odoo_redeem_path: '/snabbb/reward/api/redeem2',
                        },
                    };
                }

                return json(redeemed.body, redeemed.res.status);
            } catch (err) {
                return json({
                    ok: false,
                    error: 'worker_proxy_exception',
                    message: err && err.message ? err.message : String(err),
                    active_worker_fix: 'redeem-forward-email-v2',
                }, 502);
            }
        }


        if (url.hostname === 'app.snabbb.com' && url.pathname === '/sso/check') {
            const newUrl = new URL(request.url);
            newUrl.pathname = '/sso-check.html';
            return fetch(new Request(newUrl.toString(), request));
        }

        if (url.pathname === '/api/sso/ambient-redirect' && url.hostname === 'app.snabbb.com') {
    const returnUrl = url.searchParams.get('return_url') || 'https://my.mrbur.shop';
    
    let parsedReturnUrl;
    try {
        parsedReturnUrl = new URL(returnUrl);
        const allowedHosts = ['my.mrburstudio.com','mrbur.odoo.com','www.mrbur.shop','mrbur.shop','my.mrbur.shop','sg.mrbur.shop','th.mrbur.shop','id.mrbur.shop','us.mrbur.shop','uk.mrbur.shop','au.mrbur.shop','vn.mrbur.shop','ph.mrbur.shop','kr.mrbur.shop','ca.mrbur.shop','ae.mrbur.shop','sa.mrbur.shop','nz.mrbur.shop','eu.mrbur.shop'];
        if (!allowedHosts.includes(parsedReturnUrl.hostname)) {
            return new Response('Invalid return_url', { status: 400 });
        }
    } catch {
        return new Response('Invalid return_url', { status: 400 });
    }

    const cookieHeader = request.headers.get('Cookie') || '';
    const sessionIds = [];
    const cookieRegex = /(?:^|;\s*)session_id=([^;]+)/gi;
    let m;
    while ((m = cookieRegex.exec(cookieHeader)) !== null) sessionIds.push(m[1]);

    let workingSessionId = null;
        for (const sid of [...sessionIds].reverse()) {
            const checkRes = await fetch('https://mrbur.odoo.com/web/session/get_session_info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': `session_id=${sid}` },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: 1 }),
            });
            const checkData = await checkRes.json().catch(() => null);
            if (checkData?.result?.uid) { workingSessionId = sid; break; }
        }

        if (!workingSessionId) {
            return new Response(null, {
                status: 302,
                headers: { 'Location': returnUrl, 'Cache-Control': 'no-store' },
            });
        }

        const tokenRes = await fetch('https://mrbur.odoo.com/sso/generate_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': `session_id=${workingSessionId}` },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
        });
        const tokenData = await tokenRes.json().catch(() => null);
        const token = tokenData?.result?.token;

        if (!token) {
            return new Response(null, {
                status: 302,
                headers: { 'Location': returnUrl, 'Cache-Control': 'no-store' },
            });
        }

        const callbackUrl = new URL(parsedReturnUrl.origin);
        callbackUrl.pathname = '/sso/callback';
        callbackUrl.searchParams.set('token', token);
        callbackUrl.searchParams.set('next', parsedReturnUrl.pathname + parsedReturnUrl.search);

        return new Response(null, {
            status: 302,
            headers: { 'Location': callbackUrl.toString(), 'Cache-Control': 'no-store' },
        });
    }

        // ==============================
        // ✅ COOKIE CONFIG (SHARED ACROSS SUBDOMAINS)
        // ==============================
        const COOKIE_NAME = "mrbur_sso";
        const COOKIE_ODOO_NAME = "session_id";
        const COOKIE_DOMAIN = ".mrbur.shop"; // ✅ shared across all subdomains
        const DEFAULT_MAX_AGE = 60 * 60; // 1 hour

        // ==============================
        // ✅ CORS
        // ==============================
        const origin = request.headers.get("Origin");
        const allowedOrigins = new Set([
            "https://my.mrburstudio.com",
            "https://th.mrburstudio.com",
            "https://sg.mrburstudio.com",
            "https://vn.mrburstudio.com",
            "https://id.mrburstudio.com",
            "https://jp.mrburstudio.com",
            "https://www.mrburstudio.com",
            "https://mrburstudio.com",
            "https://jaylee-farouche-baldly.ngrok-free.dev",
            "https://app.snabbb.com",
            "https://inventory.snabbb.com",
            "https://appointment.snabbb.com",
            "https://imageai.snabbb.com",
            "https://event.snabbb.com",
            "https://recruitment.snabbb.com",
            "https://calculator.snabbb.com",
            "https://e-learning.snabbb.com",
            "https://todo.snabbb.com",
            "https://shop.snabbb.com",
            "https://mrbur.odoo.com",
            "http://localhost:3000",
            "http://localhost:5173",
            "https://e-learning.snabbb.com",
            "https://my.mrbur.shop",
            "https://sg.mrbur.shop",
            "https://th.mrbur.shop",
            "https://id.mrbur.shop",
            "https://us.mrbur.shop",
            "https://uk.mrbur.shop",
            "https://au.mrbur.shop",
            "https://vn.mrbur.shop",
            "https://ph.mrbur.shop",
            "https://kr.mrbur.shop",
            "https://ca.mrbur.shop",
            "https://ae.mrbur.shop",
            "https://sa.mrbur.shop",
            "https://nz.mrbur.shop",
            "https://eu.mrbur.shop",
        ]);

        const isApi = url.pathname.startsWith("/api/");

        // NOTE: for cookies, Origin MUST be echoed (not "*")
        const corsHeaders = isApi
            ? {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
                    "Access-Control-Allow-Headers":
                        "Authorization, Content-Type, Accept, X-Requested-With, X-SSO-API-KEY, Cookie",
                    "Access-Control-Max-Age": "86400",
                    Vary: "Origin",
                }
            : {};

        // Preflight
        if (isApi && request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

if (url.pathname.startsWith("/auth/verify/email")) {
    const odooUrl = `https://mrbur.odoo.com/auth/verify/email${url.search}`;
    
    // Fetch Odoo response manually instead of redirecting
    const odooRes = await fetch(odooUrl, {
        method: "GET",
        redirect: "manual", // catch the redirect, don't follow it
    });

    const resHeaders = new Headers();

    // Capture session_id from Odoo's Set-Cookie
    const setCookies = odooRes.headers.getSetCookie?.() || [];
    for (const cookie of setCookies) {
        const match = cookie.match(/session_id=([^;]+)/i);
        if (match) {
            // Re-issue as .snabbb.com shared cookie
            resHeaders.append("Set-Cookie", buildSharedOdooSessionCookie(match[1]));

            resHeaders.append("Set-Cookie", [
                `session_id=${match[1]}`,
                "Path=/",
                "Domain=.mrbur.shop",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                "Max-Age=21600",
            ].join("; "));
        }
    }

    // Get the redirect location from Odoo
    let location = odooRes.headers.get("Location") || "https://app.snabbb.com";
    
    // If Odoo redirects to mrbur.odoo.com, rewrite to app.snabbb.com
    if (location.startsWith("https://mrbur.odoo.com")) {
        location = location.replace("https://mrbur.odoo.com", "https://app.snabbb.com");
    }
    // If relative path, make absolute
    if (location.startsWith("/")) {
        location = `https://app.snabbb.com${location}`;
    }

    resHeaders.set("Location", location);
    resHeaders.set("Cache-Control", "no-store");

    return new Response(null, {
        status: 302,
        headers: resHeaders,
    });
}

if (CHECKOUT_API_PATHS.has(url.pathname)) {
  const odooUrl = `https://${ODOO_DEV_HOST}${url.pathname}${url.search}`;

  const odooRes = await fetch(odooUrl, {
    method: request.method,
    headers: {
      'Content-Type': 'application/json',
      // GET requests here (/state, /countries, /states) still need the
      // session cookie forwarded — unlike the "no session_id on GET to
      // root pages" carve-out noted elsewhere in this Worker, these are
      // JSON API calls, not root-page navigations, so that exception
      // should NOT apply here. Double-check this against whatever
      // condition actually gates that carve-out in your real file.
      'Cookie': request.headers.get('Cookie') || '',
    },
    body: request.method === 'POST' ? await request.text() : undefined,
  });

  return new Response(await odooRes.text(), {
    status: odooRes.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': request.headers.get('Origin') || 'https://app.snabbb.com',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-store',
    },
  });
}

if (
    url.hostname.endsWith(".mrbur.shop") &&
    url.pathname === "/sso/plant-cookie"
) {
    const sid = url.searchParams.get("sid");
    const reqOrigin = request.headers.get("Origin") || "https://app.snabbb.com";
    const allowedPlantOrigins = ["https://app.snabbb.com", "https://my.mrbur.shop"];
    const corsOrigin = allowedPlantOrigins.includes(reqOrigin) ? reqOrigin : "https://app.snabbb.com";

    // ✅ Handle preflight FIRST inside the same block
    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    if (!sid) {
        return new Response(JSON.stringify({ ok: false, error: "missing sid" }), {
            status: 400,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true",
            },
        });
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": corsOrigin,
            "Access-Control-Allow-Credentials": "true",
            "Set-Cookie": [
                `session_id=${sid}`,
                "Path=/",
                "Domain=.mrbur.shop",
                "HttpOnly",
                "Secure",
                "SameSite=None",
                "Max-Age=21600",
            ].join("; "),
        },
    });
}

if (url.pathname === '/api/sso/generate_token' && url.hostname === 'app.snabbb.com') {
    const reqOrigin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': reqOrigin,
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    // Extract session_id from cookie — try all session IDs like check-snabbb-session does
    const cookieHeader = request.headers.get('Cookie') || '';
    const sessionIds = [];
    const cookieRegex = /(?:^|;\s*)session_id=([^;]+)/gi;
    let match;
    while ((match = cookieRegex.exec(cookieHeader)) !== null) {
        sessionIds.push(match[1]);
    }

    console.log('[generate_token] session IDs found:', sessionIds.length);

    // Try each session ID — use the first one that Odoo accepts
    let workingSessionId = null;
    for (const sid of [...sessionIds].reverse()) {
        const checkRes = await fetch('https://mrbur.odoo.com/web/session/get_session_info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session_id=${sid}`,
            },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: 1 }),
        });
        const checkData = await checkRes.json().catch(() => null);
        console.log('[generate_token] uid for sid:', checkData?.result?.uid);
        if (checkData?.result?.uid) {
            workingSessionId = sid;
            break;
        }
    }

    if (!workingSessionId) {
        console.log('[generate_token] no valid session found');
        return new Response(JSON.stringify({
            jsonrpc: '2.0', id: null,
            result: { error: 'session_expired' }
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': reqOrigin,
                'Access-Control-Allow-Credentials': 'true',
            },
        });
    }

    console.log('[generate_token] using session:', workingSessionId.substring(0, 20));

    const res = await fetch('https://mrbur.odoo.com/sso/generate_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': `session_id=${workingSessionId}`,
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
    });

    const data = await res.json().catch(() => null);
    console.log('[generate_token] Odoo response:', JSON.stringify(data));

    return new Response(JSON.stringify(data), {
        status: res.ok ? 200 : res.status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': reqOrigin,
            'Access-Control-Allow-Credentials': 'true',
        },
    });
}

// if (
//      (url.hostname === "mrburstudio.com" || url.hostname === "www.mrburstudio.com") &&
//      !url.pathname.startsWith("/web/login") 
// ) {
//      return new Response(null, {
//          status: 302,
//          headers: {
//              Location: `https://${url.hostname}/web/login`,
//              "Cache-Control": "no-store",
//          },
//      });
// }
if (
    (url.hostname === "mrburstudio.com" || url.hostname === "www.mrburstudio.com") &&
    (url.pathname === "/home" || url.pathname.startsWith("/home/"))
) {
    return new Response(null, {
        status: 302,
        headers: {
            Location: `https://${url.hostname}`,
            "Cache-Control": "no-store",
        },
    });
}

// =====================================================
// ✅ MRBURSTUDIO COUNTRY ROUTING + ODOO PROXY
// Cloudflare decides country. Odoo still uses mrbur.shop domains.
// =====================================================

const countryHostMap = {
    MY: "my.mrburstudio.com",
    TH: "th.mrburstudio.com",
    SG: "sg.mrburstudio.com",
    VN: "vn.mrburstudio.com",
    ID: "id.mrburstudio.com",
    JP: "jp.mrburstudio.com",
};

const odooWebsiteHostMap = {
    "my.mrburstudio.com": "my.mrbur.shop",
    "th.mrburstudio.com": "th.mrbur.shop",
    "sg.mrburstudio.com": "sg.mrbur.shop",
    "vn.mrburstudio.com": "vn.mrbur.shop",
    "id.mrburstudio.com": "id.mrbur.shop",
    "us.mrburstudio.com": "us.mrbur.shop",
    "uk.mrburstudio.com": "uk.mrbur.shop",
    "au.mrburstudio.com": "au.mrbur.shop",
    "jp.mrburstudio.com": "jp.mrbur.shop",
    "kr.mrburstudio.com": "kr.mrbur.shop",
    "ph.mrburstudio.com": "ph.mrbur.shop",
    "ca.mrburstudio.com": "ca.mrbur.shop",
    "sa.mrburstudio.com": "sa.mrbur.shop",
    "ae.mrburstudio.com": "ae.mrbur.shop",
    "nz.mrburstudio.com": "nz.mrbur.shop",
    "eu.mrburstudio.com": "eu.mrbur.shop",
};

const publicHostMap = {
    "my.mrbur.shop": "my.mrburstudio.com",
    "th.mrbur.shop": "th.mrburstudio.com",
    "sg.mrbur.shop": "sg.mrburstudio.com",
    "vn.mrbur.shop": "vn.mrburstudio.com",
    "id.mrbur.shop": "id.mrburstudio.com",
    "us.mrbur.shop": "us.mrburstudio.com",
    "uk.mrbur.shop": "uk.mrburstudio.com",
    "au.mrbur.shop": "au.mrburstudio.com",
    "jp.mrbur.shop": "jp.mrburstudio.com",
    "kr.mrbur.shop": "kr.mrburstudio.com",
    "ph.mrbur.shop": "ph.mrburstudio.com",
    "ca.mrbur.shop": "ca.mrburstudio.com",
    "sa.mrbur.shop": "sa.mrburstudio.com",
    "ae.mrbur.shop": "ae.mrburstudio.com",
    "nz.mrbur.shop": "nz.mrburstudio.com",
    "eu.mrbur.shop": "eu.mrburstudio.com",
    "www.mrbur.shop": "www.mrburstudio.com",
    "mrbur.shop": "mrburstudio.com",
    "mrbur.odoo.com": url.hostname,
};

// 1) Main mrburstudio domain must redirect to country subdomain first
if (
    (url.hostname === "mrburstudio.com" || url.hostname === "www.mrburstudio.com") &&
    !url.pathname.startsWith("/api/")
) {
    const country = request.cf?.country || "MY";
    const targetHost = countryHostMap[country] || "my.mrburstudio.com";

    return Response.redirect(`https://${targetHost}${url.pathname}${url.search}`, 302);
}

if (
    url.hostname.endsWith(".mrburstudio.com") &&
    url.pathname.startsWith("/websocket")
) {
    return new Response("WebSocket is not proxied by this Worker", {
        status: 426,
        headers: {
            "Cache-Control": "no-store",
        },
    });
}

if (url.pathname === '/debug/cookies' && url.hostname.endsWith('.mrburstudio.com')) {
    return new Response(JSON.stringify({
        cookies: request.headers.get('Cookie'),
        hostname: url.hostname,
    }), { headers: { 'Content-Type': 'application/json' } });
}

// 2) Only country subdomains proxy to Odoo
if (
    url.hostname.endsWith(".mrburstudio.com") &&
    url.hostname !== "www.mrburstudio.com" &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/websocket")
) {
    const UPSTREAM_ORIGIN = "https://mrbur.odoo.com";
    const STUDIO_COOKIE_DOMAIN = ".mrburstudio.com";

    const upstreamHeaders = new Headers(request.headers);

    // Do not forward all browser cookies to Odoo.
    // Only forward session_id.
    upstreamHeaders.delete("Cookie");

    const browserCookie = request.headers.get("Cookie") || "";
    const sessionMatch = browserCookie.match(/(?:^|;\s*)session_id=([^;]+)/i);

    if (sessionMatch) {
        upstreamHeaders.set("Cookie", `session_id=${sessionMatch[1]}`);
    }

    const odooWebsiteHost = odooWebsiteHostMap[url.hostname] || "my.mrbur.shop";

    const upstreamUrl = new URL(`https://${odooWebsiteHost}${url.pathname}`);
    upstreamUrl.search = url.search;

    upstreamHeaders.set("Host", odooWebsiteHost);

    const upstreamRes = await fetch(upstreamUrl.toString(), {
        method: request.method,
        headers: upstreamHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
    });

    const resHeaders = new Headers(upstreamRes.headers);

    // Rewrite redirects from mrbur.shop back to mrburstudio.com
    const loc = resHeaders.get("Location");
    if (loc) {
        try {
            const locUrl = new URL(loc, UPSTREAM_ORIGIN);

            if (publicHostMap[locUrl.hostname]) {
                locUrl.hostname = publicHostMap[locUrl.hostname];
                locUrl.protocol = "https:";
                resHeaders.set("Location", locUrl.toString());
            }
        } catch {}
    }

    // Remove upstream Set-Cookie first, then re-issue clean cookies for .mrburstudio.com
    resHeaders.delete("Set-Cookie");
    resHeaders.delete("set-cookie");

    const setCookies = upstreamRes.headers.getSetCookie?.() || [];

    for (const cookie of setCookies) {
        let rewritten = cookie;

        // Always rewrite cookie domain to .mrburstudio.com
        if (/Domain=/i.test(rewritten)) {
            rewritten = rewritten.replace(/Domain=[^;]+/i, `Domain=${STUDIO_COOKIE_DOMAIN}`);
        } else {
            rewritten = `${rewritten}; Domain=${STUDIO_COOKIE_DOMAIN}`;
        }

        if (!/Path=/i.test(rewritten)) {
            rewritten += "; Path=/";
        }

        if (!/Secure/i.test(rewritten)) {
            rewritten += "; Secure";
        }

        // For normal same-site mrburstudio browsing, Lax is safer and enough.
        // Use None only if this cookie must be sent inside iframe/cross-site fetch.
        if (/SameSite=/i.test(rewritten)) {
            rewritten = rewritten.replace(/SameSite=[^;]+/i, "SameSite=Lax");
        } else {
            rewritten += "; SameSite=Lax";
        }

        // Keep Odoo's own Expires/Max-Age if it exists.
        // If Odoo did not provide one, add 6 hours.
        if (!/Max-Age=/i.test(rewritten) && !/Expires=/i.test(rewritten)) {
            rewritten += "; Max-Age=21600";
        }

        resHeaders.append("Set-Cookie", rewritten);
    }

    // Prevent browser/proxy from caching logged-in pages
    resHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    resHeaders.set("Pragma", "no-cache");
    resHeaders.set("Expires", "0");

    const safeStatus =
        upstreamRes.status >= 200 && upstreamRes.status <= 599
            ? upstreamRes.status
            : 502;

    return new Response(upstreamRes.body, {
        status: safeStatus,
        headers: resHeaders,
    });
}

        // // ==============================
        // // ✅ ALWAYS SERVE LATEST HTML FOR MAIN APP ONLY
        // // ==============================
        // const accept = request.headers.get("accept") || "";
            
        // const isMainAppHtmlRequest =
        //      request.method === "GET" &&
        //      accept.includes("text/html") &&
        //      (
        //          url.pathname === "/" ||
        //          url.pathname === "/login" ||
        //          url.pathname === "/signup"
        //      );
        
        // if (isMainAppHtmlRequest) {
        //      const upstreamRes = await fetch(request, {
        //          cf: {
        //              cacheTtl: 0,
        //              cacheEverything: false,
        //          },
        //      });
        
        //      const finalRes = new Response(upstreamRes.body, upstreamRes);
        //      finalRes.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        //      finalRes.headers.set("Pragma", "no-cache");
        //      finalRes.headers.set("Expires", "0");
        //      finalRes.headers.set("X-Debug-Cache", "html-no-cache");
        
        //      return finalRes;
        // }

        // ==============================
        // ✅ HELPERS
        // ==============================
        // -------------------------------------------------------
// Helper: shared proxy logic for mrburstudio.com domains
// -------------------------------------------------------
async function proxyToOdoo({ odooHost, cookieDomain }) {
    const upstreamUrl = new URL(`https://${odooHost}${url.pathname}`);
    upstreamUrl.search = url.search;

    const upstreamHeaders = new Headers(request.headers);

    // Do not forward all cookies. Only forward Odoo session_id.
    upstreamHeaders.delete("Cookie");

    const browserCookie = request.headers.get("Cookie") || "";
    const sessionMatch = browserCookie.match(/(?:^|;\s*)session_id=([^;]+)/i);

    // IMPORTANT:
    // Always forward session_id, including GET requests.
    // Odoo page loads are mostly GET. If GET has no cookie, Odoo sees the user as logged out.
    if (sessionMatch) {
        upstreamHeaders.set("Cookie", `session_id=${sessionMatch[1]}`);
    }

    upstreamHeaders.set("Host", odooHost);

    const upstreamRes = await fetch(upstreamUrl.toString(), {
        method: request.method,
        headers: upstreamHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
        redirect: "manual",
    });

    const resHeaders = new Headers(upstreamRes.headers);

    const loc = resHeaders.get("Location");
    if (loc) {
        try {
            const locUrl = new URL(loc, `https://${odooHost}`);

            if (publicHostMap[locUrl.hostname]) {
                locUrl.hostname = publicHostMap[locUrl.hostname];
                locUrl.protocol = "https:";
                resHeaders.set("Location", locUrl.toString());
            }
        } catch {}
    }

    resHeaders.delete("Set-Cookie");
    resHeaders.delete("set-cookie");

    const setCookies = upstreamRes.headers.getSetCookie?.() || [];

    for (const cookie of setCookies) {
        let rewritten = cookie;

        if (/Domain=/i.test(rewritten)) {
            rewritten = rewritten.replace(/Domain=[^;]+/i, `Domain=${cookieDomain}`);
        } else {
            rewritten = `${rewritten}; Domain=${cookieDomain}`;
        }

        if (!/Path=/i.test(rewritten)) {
            rewritten += "; Path=/";
        }

        if (!/Secure/i.test(rewritten)) {
            rewritten += "; Secure";
        }

        if (/SameSite=/i.test(rewritten)) {
            rewritten = rewritten.replace(/SameSite=[^;]+/i, "SameSite=Lax");
        } else {
            rewritten += "; SameSite=Lax";
        }

        if (!/Max-Age=/i.test(rewritten) && !/Expires=/i.test(rewritten)) {
            rewritten += "; Max-Age=21600";
        }

        resHeaders.append("Set-Cookie", rewritten);
    }

    resHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    resHeaders.set("Pragma", "no-cache");
    resHeaders.set("Expires", "0");

    const safeStatus =
        upstreamRes.status >= 200 && upstreamRes.status <= 599
            ? upstreamRes.status
            : 502;

    return new Response(upstreamRes.body, {
        status: safeStatus,
        headers: resHeaders,
    });
}

        function appendRewrittenCookies(outHeaders, upstreamRes, targetDomain = ".snabbb.com") {
    const setCookies = upstreamRes.headers.getSetCookie?.() ?? [];

    for (const cookie of setCookies) {
        let rewritten = cookie;

        if (/Domain=/i.test(rewritten)) {
            rewritten = rewritten.replace(/Domain=[^;]+/i, `Domain=${targetDomain}`);
        } else {
            rewritten = `${rewritten}; Domain=${targetDomain}`;
        }

        outHeaders.append("Set-Cookie", rewritten);
    }
}

class RemoveMyInventoryLink {
    element(el) {
        el.remove();
    }
}

function copyResponseHeadersWithoutSetCookie(upstreamRes) {
    const outHeaders = new Headers();
    for (const [key, value] of upstreamRes.headers.entries()) {
        if (key.toLowerCase() === "set-cookie") continue;
        outHeaders.append(key, value);
    }
    return outHeaders;
}

    function getSessionCookieDomain(hostname) {
        if (
                hostname === "mrburstudio.com" ||
                hostname === "www.mrburstudio.com" ||
                hostname.endsWith(".mrburstudio.com")
            ) {
                return ".mrburstudio.com";
            }

        if (hostname.endsWith(".snabbb.com")) {
            return ".snabbb.com";
        }

        if (hostname === "mrbur.shop" || hostname.endsWith(".mrbur.shop")) {
            return ".mrbur.shop";
        }

        return undefined;
    }

        function getCookieValue(req, name) {
            const cookie = req.headers.get("Cookie") || "";
            const parts = cookie.split(";").map((v) => v.trim());
            for (const part of parts) {
                if (part.startsWith(name + "=")) return part.slice(name.length + 1);
            }
            return null;
        }
        
        // extract "session_id=XXXX" from any Set-Cookie header
        function parseSessionIdFromSetCookie(setCookie) {
            if (!setCookie) return null;
            const m = setCookie.match(/(?:^|;\s*)session_id=([^;]+)/i);
            return m?.[1] || null;
        }
        
        // IMPORTANT: make Odoo session cookie shared across *.snabbb.com
        function buildSharedOdooSessionCookie(sessionId, { maxAge = 60 * 60 * 6 } = {}) {
            // You can tune maxAge; Odoo session might still expire server-side earlier/later.
            return [
                `session_id=${sessionId}`,
                "Path=/",
                `Domain=.snabbb.com`,
                "HttpOnly",
                "Secure",
                "SameSite=None",
                `Max-Age=${maxAge}`,
            ].join("; ");
        }
        function json(data, status = 200, extraHeaders = {}) {
            return new Response(JSON.stringify(data), {
                status,
                headers: { "Content-Type": "application/json", ...corsHeaders, ...extraHeaders },
            });
        }
        
        function parseCookie(setCookieHeader) {
            // Odoo returns something like: "session_id=...; Expires=...; Max-Age=...; HttpOnly; Path=/; SameSite=Lax; Secure"
            // We want just: "session_id=..."
            if (!setCookieHeader) return null;
            const part = setCookieHeader.split(";")[0]?.trim();
            return part && part.startsWith("session_id=") ? part : null;
        }
        
        function getBearer(request) {
            const h = request.headers.get("Authorization") || "";
            const m = h.match(/^Bearer\s+(.+)$/i);
            return m?.[1] || null;
        }

        // Compare signatures by recomputing HS256
        async function verifyHS256({ token, secret }) {
            try {
                const parts = token.split(".");
                if (parts.length !== 3) return { ok: false, error: "bad_format" };
            
                const [h, p, sig] = parts;
                const signingInput = `${h}.${p}`;
            
                // Re-sign payload and compare signature
                const enc = new TextEncoder();
                const key = await crypto.subtle.importKey(
                    "raw",
                    enc.encode(secret),
                    { name: "HMAC", hash: "SHA-256" },
                    false,
                    ["sign"]
                );
            
                const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
                const expected = base64UrlEncodeBytes(new Uint8Array(sigBuf)); // you already defined this earlier
            
                if (expected !== sig) return { ok: false, error: "bad_sig" };
            
                // Decode payload
                const jsonStr = atob(p.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((p.length + 3) % 4));
                const payload = JSON.parse(jsonStr);
            
                const now = Math.floor(Date.now() / 1000);
                if (payload?.exp && now >= payload.exp) return { ok: false, error: "expired" };
            
                return { ok: true, payload };
            } catch (e) {
                return { ok: false, error: "verify_failed" };
            }
        }

        function kvKeyForOdoo(uid) {
            return `odoo_session:${uid}`;
        }

        async function odooJsonRpc({ base, path, body, cookie = "" }) {
            const res = await fetch(`${base}${path}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    ...(cookie ? { Cookie: cookie } : {}),
                },
                body: JSON.stringify(body),
            });
        
            const setCookie = res.headers.get("Set-Cookie"); // may be null
            const data = await res.json().catch(() => null);
            return { res, data, setCookie };
        }

        function getCookie(req, name) {
            const cookie = req.headers.get("Cookie") || "";
            const parts = cookie.split(";").map((v) => v.trim());
            for (const part of parts) {
                if (part.startsWith(name + "=")) {
                    return decodeURIComponent(part.slice(name.length + 1));
                }
            }
            return null;
        }

        function base64url(input) {
            return btoa(String.fromCharCode(...new Uint8Array(input)))
                .replace(/=/g, "")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
        }

        async function signJWT(payload, secret) {
            const enc = new TextEncoder()
                
            const header = {
                alg: "HS256",
                typ: "JWT"
            }
        
            const headerBase64 = base64url(enc.encode(JSON.stringify(header)))
            const payloadBase64 = base64url(enc.encode(JSON.stringify(payload)))
        
            const data = `${headerBase64}.${payloadBase64}`
        
            const key = await crypto.subtle.importKey(
                "raw",
                enc.encode(secret),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"]
            )
        
            const signature = await crypto.subtle.sign(
                "HMAC",
                key,
                enc.encode(data)
            )
        
            const signatureBase64 = base64url(signature)
        
            return `${data}.${signatureBase64}`
        }

        function buildSetCookie({ name = COOKIE_NAME, value, domain = COOKIE_DOMAIN, maxAge = DEFAULT_MAX_AGE }) {
            return [
                `${name}=${encodeURIComponent(value)}`,
                "Path=/",
                `Domain=${domain}`, // ✅ share across subdomains
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                `Max-Age=${maxAge}`,
            ].join("; ");
        }

        function buildClearCookie() {
            return [
                `${COOKIE_NAME}=`,
                "Path=/",
                `Domain=${COOKIE_DOMAIN}`,
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                "Max-Age=0",
            ].join("; ");
        }

        // Prefer cookie, but temporarily allow Authorization header for migration
        function getTokenFromRequest(req) {
            const cookieToken = getCookie(req, COOKIE_NAME);
            if (cookieToken) return cookieToken;

            const auth = req.headers.get("Authorization");
            if (auth?.startsWith("Bearer ")) return auth.slice(7);

            return null;
        }

        function decodeAndValidateToken(token) {
            let payload;
            try {
                payload = parseJwtPayload(token);
            } catch {
                return { ok: false, error: "invalid_token", payload: null };
            }

            // optional exp check
            if (payload?.exp && payload.exp * 1000 < Date.now()) {
                return { ok: false, error: "expired", payload: null };
            }

            const email = extractEmail(payload);
            if (!email) return { ok: false, error: "missing_email", payload: null };

            return { ok: true, payload, email };
        }

    async function resolveAppointmentAccess(
        request,
        env
        ) {
        /*
        * 1. Get the logged-in user's token.
        */
        const token = getTokenFromRequest(request);

        if (!token) {
            throw Object.assign(
            new Error("Unauthorized"),
            {
                status: 401,
                code: "unauthorized",
            }
            );
        }

        /*
        * 2. Decode and validate the token.
        */
        const decoded = decodeAndValidateToken(token);

        if (!decoded.ok) {
            throw Object.assign(
            new Error(
                decoded.error || "Invalid or expired token"
            ),
            {
                status: 401,
                code: "invalid_token",
            }
            );
        }

        /*
        * 3. Find the logged-in user's profile.
        */
        const profile = await getProfileByEmail(
            env,
            decoded.email
        );

        if (!profile) {
            throw Object.assign(
            new Error("User profile not found"),
            {
                status: 403,
                code: "profile_not_found",
            }
            );
        }

        /*
        * 4. Determine whether the user is:
        *    - company owner
        *    - company member
        *    - individual user
        *
        * For company members, this also reads their role
        * from company_members.
        */
        const workspace = await resolveWorkspaceContext(
            env,
            profile
        );

        /*
        * 5. Load the effective Appointment permissions.
        */
        const access = await getEffectiveAccess(
            env,
            workspace,
            "appointment"
        );

        /*
        * 6. Find the trusted shared clinic.
        *
        * Company members use the company owner's clinic.
        * Owners and individual users use their own clinic.
        */
        let clinicId;

        if (workspace.actorType === "member") {
            const ownerProfile = await getProfileById(
            env,
            workspace.workspaceUserId
            );

            clinicId = ownerProfile?.clinic_id;
        } else {
            clinicId = profile.clinic_id;
        }

        if (!clinicId) {
            throw Object.assign(
            new Error(
                "No clinic is connected to this workspace."
            ),
            {
                status: 403,
                code: "clinic_not_found",
            }
            );
        }

        return {
            profile,
            workspace,
            access,
            clinicId,
        };
        }

        async function resolveInventoryAccess(
            request,
            env
            ) {
            const token = getTokenFromRequest(request);

            if (!token) {
                throw Object.assign(
                new Error("Unauthorized"),
                {
                    status: 401,
                    code: "unauthorized",
                }
                );
            }

            const decoded =
                decodeAndValidateToken(token);

            if (!decoded.ok) {
                throw Object.assign(
                new Error(
                    decoded.error ||
                    "Invalid or expired token"
                ),
                {
                    status: 401,
                    code: "invalid_token",
                }
                );
            }

            const profile =
                await getProfileByEmail(
                env,
                decoded.email
                );

            if (!profile) {
                throw Object.assign(
                new Error("User profile not found"),
                {
                    status: 403,
                    code: "profile_not_found",
                }
                );
            }

            const workspace =
                await resolveWorkspaceContext(
                env,
                profile
                );

            const access =
                await getEffectiveAccess(
                env,
                workspace,
                "inventory"
                );

            return {
                profile,
                workspace,
                access,

                /*
                * Individual: their own user ID.
                * Company owner: their own user ID.
                * Company member: company owner's user ID.
                */
                workspaceUserId:
                workspace.workspaceUserId,
            };
            }

        function rewriteLocationHeader(locationValue) {
            try {
                const u = new URL(locationValue);
                
                // ✅ SHOP
                if (u.hostname === ODOO_SHOP_HOST) {
                    u.hostname = PUBLIC_SHOP_HOST;                    // shop.snabbb.com
                    u.protocol = "https:";
                    return u.toString();
                }

                if (u.hostname.endsWith(".mrbur.shop")) {
                    return u.toString(); // pass through as-is to the browser
                }
            
                // ✅ EVENT
                if (u.hostname === ODOO_EVENT_HOST) {
                    u.hostname = PUBLIC_EVENT_HOST;                  // event.snabbb.com
                    u.protocol = "https:";
                    return u.toString();
                }
                return u.toString();
            } catch {
                return locationValue;
            }
        }

        function rewriteSetCookieDomain(headers) {
            if (typeof headers.getSetCookie !== "function") return;
            const cookies = headers.getSetCookie();
            if (!cookies?.length) return;

            headers.delete("Set-Cookie");

            for (const c of cookies) {
                const updated = c
                    .replace(/Domain=\.odoo\.com/gi, `Domain=${COOKIE_DOMAIN}`)
                    .replace(
                        new RegExp(`Domain=${ODOO_EVENT_HOST}`, "gi"),
                        `Domain=${COOKIE_DOMAIN}`
                    );
                headers.append("Set-Cookie", updated);
            }
        }

        async function getSupabaseUserByEmail(env, email) {
            const target = String(email || "").trim().toLowerCase();
            if (!target) return null;
        
            let page = 1;
            const perPage = 200;
        
            while (true) {
                const res = await fetch(
                    `${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
                    {
                        headers: {
                            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            "Content-Type": "application/json",
                        },
                    }
                );
            
                const data = await res.json().catch(() => null);
            
                if (!res.ok) {
                    console.log("list users failed", res.status, data);
                    return null;
                }
            
                const users = Array.isArray(data?.users) ? data.users : [];
                const match = users.find(
                    (u) => String(u?.email || "").trim().toLowerCase() === target
                );
            
                if (match) return match;
            
                if (users.length < perPage) break;
                page += 1;
            }
        
            return null;
        }

        async function getSupabaseUserByOdooId(env, odooUserId) {
            const normalizedId = String(odooUserId ?? "").trim();
            if (!/^\d+$/.test(normalizedId)) return null;

            const adminHeaders = {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
            };

            // The synchronized profile is the authoritative mapping between an
            // Odoo user and its existing Supabase Auth user. Odoo login names are
            // not necessarily email addresses (for example: "marketing").
            const profileUrl = new URL(`${env.SUPABASE_URL}/rest/v1/profiles`);
            profileUrl.searchParams.set("select", "user_id");
            profileUrl.searchParams.set("odoo_user_id", `eq.${normalizedId}`);
            profileUrl.searchParams.set("limit", "2");

            const profileRes = await fetch(profileUrl.toString(), { headers: adminHeaders });
            const profiles = await profileRes.json().catch(() => null);
            if (!profileRes.ok) {
                if (!profileRes.ok) {
                    console.error("[sso] Odoo profile lookup failed", profileRes.status);
                }
                return null;
            }

            if (Array.isArray(profiles) && profiles.length === 1) {
                const userId = profiles[0]?.user_id;
                if (userId) {
                    const userRes = await fetch(
                        `${env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
                        { headers: adminHeaders }
                    );
                    if (userRes.ok) {
                        const userData = await userRes.json().catch(() => null);
                        return userData?.user ?? userData;
                    }
                    console.error("[sso] mapped Auth user lookup failed", userRes.status);
                }
            }

            // A newly created Auth user may exist before its profile mapping has
            // been populated. Fall back to the Odoo identity stored in metadata.
            let page = 1;
            const perPage = 200;
            while (true) {
                const listRes = await fetch(
                    `${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
                    { headers: adminHeaders }
                );
                const listData = await listRes.json().catch(() => null);
                if (!listRes.ok) return null;

                const users = Array.isArray(listData?.users) ? listData.users : [];
                const match = users.find((user) => {
                    const metadata = user?.user_metadata || {};
                    return String(metadata.odoo_sub ?? metadata.odoo_user_id ?? "") === normalizedId;
                });
                if (match) return match;
                if (users.length < perPage) break;
                page += 1;
            }

            return null;
        }

        async function getProfileFromSupabaseBearer(env, request) {
            const authorization = request.headers.get("Authorization") || "";
            if (!authorization.startsWith("Bearer ")) return null;

            const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
                headers: {
                    apikey: env.SUPABASE_ANON_KEY,
                    Authorization: authorization,
                    Accept: "application/json",
                },
            });
            if (!userRes.ok) return null;

            const authUser = await userRes.json().catch(() => null);
            if (!authUser?.id) return null;

            const profileUrl = new URL(`${env.SUPABASE_URL}/rest/v1/profiles`);
            profileUrl.searchParams.set("select", "*");
            profileUrl.searchParams.set("user_id", `eq.${authUser.id}`);
            profileUrl.searchParams.set("limit", "1");

            const profileRes = await fetch(profileUrl.toString(), {
                headers: {
                    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    Accept: "application/json",
                },
            });
            if (!profileRes.ok) return null;

            const profiles = await profileRes.json().catch(() => null);
            return Array.isArray(profiles) ? profiles[0] || null : null;
        }

        // ==============================
        // ✅ SUPABASE JWT SIGNING (HS256)
        // ==============================
        
        // base64url from bytes (safe for unicode)
        function base64UrlEncodeBytes(bytes) {
            let binary = "";
            const len = bytes.length;
            for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
            return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
        }
        
        function base64UrlEncodeJson(obj) {
            const json = JSON.stringify(obj);
            const bytes = new TextEncoder().encode(json);
            return base64UrlEncodeBytes(bytes);
        }
        
        async function signHS256({ header, payload, secret }) {
            const enc = new TextEncoder();
        
            const encodedHeader = base64UrlEncodeJson(header);
            const encodedPayload = base64UrlEncodeJson(payload);
            const signingInput = `${encodedHeader}.${encodedPayload}`;
        
            const key = await crypto.subtle.importKey(
                "raw",
                enc.encode(secret),
                { name: "HMAC", hash: "SHA-256" },
                false,
                ["sign"]
            );
        
            const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
            const sig = base64UrlEncodeBytes(new Uint8Array(sigBuf));
        
            return `${signingInput}.${sig}`;
        }
        
        // Build Supabase-compatible JWT payload
        function buildSupabaseJwtPayload({ sub, email, expSeconds = 3600, extra = {} }) {
            const now = Math.floor(Date.now() / 1000);
            return {
                aud: "authenticated",
                role: "authenticated",
                sub: String(sub),
                email: String(email),
                iat: now,
                exp: now + expSeconds,
                ...extra,
            };
        }

        /* =======================================
            ⭐ SSO → SUPABASE JWT EXCHANGE
        ======================================= */
        async function handleSSO(request, env) {
            try {
                // A launch token belongs to this specific app/tab. Prefer it over the
                // shared .snabbb.com cookie, which another concurrently opened app may
                // already have replaced. The cookie remains as a backwards-compatible
                // fallback for older mini-app deployments.
                const exchangeUrl = new URL(request.url);
                const explicitToken =
                    exchangeUrl.searchParams.get("sso_token") ||
                    exchangeUrl.searchParams.get("token");
                const token = explicitToken || getTokenFromRequest(request);
            
                if (!token) {
                    return new Response(JSON.stringify({ ok: false, error: "missing_sso" }), {
                        status: 401,
                        headers: {
                            "Content-Type": "application/json",
                            ...corsHeaders,
                            "Set-Cookie": buildClearCookie(),
                        },
                    });
                }
            
                const decoded = decodeAndValidateToken(token);
                console.log("decoded:", JSON.stringify(decoded));
            
                if (!decoded.ok) {
                    return new Response(JSON.stringify({ ok: false, error: decoded.error }), {
                        status: 401,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    });
                }
            
                let email = decoded.payload?.email?.trim().toLowerCase();
                const name = decoded.payload?.name?.trim() || "";
                const odooSub = decoded.payload?.sub ?? null;
            
                console.log("email:", email);
                console.log("name:", name);
                console.log("odooSub:", odooSub);
            
                if (!email) {
                    return new Response(
                        JSON.stringify({
                            ok: false,
                            error: "missing_email_in_token",
                            decoded,
                        }),
                        {
                            status: 400,
                            headers: { "Content-Type": "application/json", ...corsHeaders },
                        }
                    );
                }
            
                const hasValidEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                let sbUser = await getSupabaseUserByOdooId(env, odooSub);
                if (!sbUser && hasValidEmailFormat) {
                    sbUser = await getSupabaseUserByEmail(env, email);
                }

                if (sbUser?.email) {
                    email = String(sbUser.email).trim().toLowerCase();
                }

                if (!sbUser && !hasValidEmailFormat) {
                    const normalizedOdooId = String(odooSub ?? "").trim();
                    if (!/^\d+$/.test(normalizedOdooId)) {
                        return new Response(
                            JSON.stringify({ ok: false, error: "missing_stable_odoo_identity" }),
                            {
                                status: 400,
                                headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
                            }
                        );
                    }
                    // Supabase Auth requires a valid email-shaped identifier. This
                    // deterministic internal address is never used to send mail.
                    email = `odoo-${normalizedOdooId}@sso.snabbb.com`;
                }
                console.log("sbUser:", sbUser);
            
                if (!sbUser) {
                    const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
                        method: "POST",
                        headers: {
                            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            email,
                            email_confirm: true,
                            password: crypto.randomUUID() + crypto.randomUUID(),
                            user_metadata: {
                                sso: "odoo",
                                name,
                                odoo_sub: odooSub,
                                odoo_user_id: odooSub,
                                odoo_login: decoded.payload?.login || decoded.payload?.email || null,
                            },
                        }),
                    });
                
                    const createdText = await createRes.text();
                    let created = null;
                
                    try {
                        created = createdText ? JSON.parse(createdText) : null;
                    } catch (e) {
                        created = { raw: createdText };
                    }
                
                    console.log("createRes.status:", createRes.status);
                    console.log("createRes.body:", created);
                
                    if (!createRes.ok) {
                        const isEmailExists =
                            created?.error_code === "email_exists" ||
                            created?.msg?.toLowerCase?.().includes("already been registered");

                        if (isEmailExists) {
                            sbUser = await getSupabaseUserByEmail(env, email);
                        
                            if (!sbUser) {
                                const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
                                    method: "POST",
                                    headers: {
                                        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                                        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        email,
                                        email_confirm: true,
                                        password: crypto.randomUUID() + crypto.randomUUID(),
                                        user_metadata: {
                                            sso: "odoo",
                                            name,
                                            odoo_sub: odooSub,
                                        },
                                    }),
                                });
                            
                                const createdText = await createRes.text();
                                let created = null;
                            
                                try {
                                    created = createdText ? JSON.parse(createdText) : null;
                                } catch {
                                    created = { raw: createdText };
                                }

                                console.log("createRes.status:", createRes.status);
                                console.log("createRes.body:", created);

    if (!createRes.ok) {
        const isEmailExists =
            created?.error_code === "email_exists" ||
            created?.msg?.toLowerCase?.().includes("already been registered");

        if (isEmailExists) {
            console.log("User already exists, fetching existing Supabase user:", email);

            sbUser = await getSupabaseUserByEmail(env, email);

                            if (!sbUser) {
                                return new Response(
                                    JSON.stringify({
                                        ok: false,
                                        error: "supabase_email_exists_but_lookup_failed",
                                        email,
                                        details: created,
                                    }),
                                    {
                                        status: 500,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                    }
                                );
                                        }
                                    } else {
                                        return new Response(
                                            JSON.stringify({
                                                ok: false,
                                                error: "supabase_create_failed",
                                                email,
                                                details: created,
                                            }),
                                            {
                                                status: 500,
                                                headers: { "Content-Type": "application/json", ...corsHeaders },
                                            }
                                        );
                                    }
                                } else {
                                    sbUser = created?.user ?? created;
                                }
                            }
                        } else {
                            return new Response(
                                JSON.stringify({
                                    ok: false,
                                    error: "supabase_create_failed",
                                    email,
                                    details: created,
                                }),
                                {
                                    status: 500,
                                    headers: { "Content-Type": "application/json", ...corsHeaders },
                                }
                            );
                        }
                    } else {
                        sbUser = created?.user ?? created;
                    }
                
                    sbUser = created?.user ?? created;
                }
            
                // A concurrent or immediately repeated first login can create the
                // deterministic Odoo Auth user in the first request and receive
                // `email_exists` in the next one. Never treat that error payload as
                // a user; resolve the already-created user before continuing.
                if (!sbUser?.id) {
                    const existingUser = await getSupabaseUserByEmail(env, email);
                    if (existingUser?.id) sbUser = existingUser;
                }

                console.log("final sbUser:", sbUser);
            
                if (!sbUser?.id) {
                    return new Response(
                        JSON.stringify({
                            ok: false,
                            error: "supabase_user_missing_id",
                            email,
                            sbUser,
                        }),
                        {
                            status: 500,
                            headers: { "Content-Type": "application/json", ...corsHeaders },
                        }
                    );
                }

                await syncOdooInternalAdminStatus(
                    env,
                    sbUser.id,
                    decoded.payload?.is_internal_user
                );
            
                // Mint a real Supabase Auth session. A hand-signed JWT is only an
                // access token; using it as refresh_token makes setSession() fail on
                // a fresh browser. Admin generate_link does not send an email, and
                // verifying its one-time token returns a genuine access/refresh pair.
                const adminHeaders = {
                    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                    "Content-Type": "application/json",
                };

                const linkRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
                    method: "POST",
                    headers: adminHeaders,
                    body: JSON.stringify({ type: "magiclink", email: sbUser.email || email }),
                });
                const linkText = await linkRes.text();
                let linkData = null;
                try {
                    linkData = linkText ? JSON.parse(linkText) : null;
                } catch {
                    linkData = null;
                }

                if (!linkRes.ok) {
                    console.error("[sso] generate_link failed", linkRes.status, linkText);
                    return new Response(
                        JSON.stringify({ ok: false, error: "supabase_generate_link_failed" }),
                        {
                            status: 502,
                            headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
                        }
                    );
                }

                let tokenHash = linkData?.properties?.hashed_token || linkData?.hashed_token || null;
                if (!tokenHash && linkData?.properties?.action_link) {
                    try {
                        tokenHash = new URL(linkData.properties.action_link).searchParams.get("token");
                    } catch {
                        tokenHash = null;
                    }
                }

                if (!tokenHash) {
                    console.error("[sso] generate_link response missing token hash");
                    return new Response(
                        JSON.stringify({ ok: false, error: "supabase_link_token_missing" }),
                        {
                            status: 502,
                            headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
                        }
                    );
                }

                const verifyRes = await fetch(`${env.SUPABASE_URL}/auth/v1/verify`, {
                    method: "POST",
                    headers: {
                        apikey: env.SUPABASE_ANON_KEY,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ type: "magiclink", token_hash: tokenHash }),
                });
                const verifyText = await verifyRes.text();
                let session = null;
                try {
                    session = verifyText ? JSON.parse(verifyText) : null;
                } catch {
                    session = null;
                }

                if (!verifyRes.ok || !session?.access_token || !session?.refresh_token) {
                    console.error("[sso] verify link failed", verifyRes.status, verifyText);
                    return new Response(
                        JSON.stringify({ ok: false, error: "supabase_session_mint_failed" }),
                        {
                            status: 502,
                            headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
                        }
                    );
                }

                return new Response(
                    JSON.stringify({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        token_type: session.token_type || "bearer",
                        expires_in: session.expires_in,
                        expires_at: session.expires_at,
                        user: session.user,
                    }),
                    {
                        status: 200,
                        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
                    }
                );
            } catch (err) {
                console.error("handleSSO crashed:", err);
            
                return new Response(
                    JSON.stringify({
                        ok: false,
                        error: "internal_error",
                        message: err?.message || String(err),
                        stack: err?.stack || null,
                    }),
                    {
                        status: 500,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    }
                );
            }
        }

        if (url.pathname === "/api/sso/odoo-exchange" && request.method === "GET") {
    const token = url.searchParams.get("token");
    const companyCode = (url.searchParams.get("company_code") || "INT").toUpperCase();
    const next = url.searchParams.get("next") || "/";
    console.log('the company code: ', companyCode);
    if (!token) return new Response("Missing token", { status: 400 });

    const COMPANY_SUBDOMAIN_MAP = {
        MMY: "my", MSG: "sg", MTH: "th", MIN: "id",
        MUSA: "us", MUK: "uk", MAU: "au", MVN: "vn",
        MPH: "ph", MKR: "kr", MCA: "ca", MAE: "ae",
        MSA: "sa", MNZ: "nz", MEU: "eu",
        MY: "my", SG: "sg", TH: "th", ID: "id",
        US: "us", GB: "uk", UK: "uk", AU: "au", VN: "vn",
        PH: "ph", KR: "kr", JP: "jp", CA: "ca", AE: "ae",
        SA: "sa", NZ: "nz", EU: "eu",
    };

    let subdomain;
    const countryOrigin = await getUserCountryShopOrigin(request);
    if (countryOrigin) {
        subdomain = new URL(countryOrigin).hostname.split(".")[0];
    } else {
        subdomain = COMPANY_SUBDOMAIN_MAP[companyCode] || "www";
    }

    const shopHost = `${subdomain}.mrbur.shop`;

    return new Response(null, {
        status: 302,
        headers: {
            "Location": `https://${shopHost}/sso/token?token=${encodeURIComponent(token)}&next=${encodeURIComponent(next)}`,
            "Cache-Control": "no-store",
        },
    });
}

        // if (url.pathname === '/api/sso/ambient-redirect' && url.hostname === 'app.snabbb.com') {
        //     const returnUrl = url.searchParams.get('return_url') || 'https://my.mrbur.shop';
        //     const companyCode = url.searchParams.get('company_code') || 'MMY';

        //     // Security: only allow redirects back to known mrbur.shop domains
        //     const allowedReturnHosts = [
        //         'mrbur.shop', 'my.mrbur.shop', 'sg.mrbur.shop', 'th.mrbur.shop',
        //         'id.mrbur.shop', 'us.mrbur.shop', 'uk.mrbur.shop', 'au.mrbur.shop',
        //         'vn.mrbur.shop', 'ph.mrbur.shop', 'kr.mrbur.shop', 'ca.mrbur.shop',
        //         'ae.mrbur.shop', 'sa.mrbur.shop', 'nz.mrbur.shop', 'eu.mrbur.shop',
        //     ];
        
        //     let parsedReturnUrl;
        //     try {
        //         parsedReturnUrl = new URL(returnUrl);
        //         if (!allowedReturnHosts.includes(parsedReturnUrl.hostname)) {
        //             return new Response('Invalid return_url', { status: 400 });
        //         }
        //     } catch {
        //         return new Response('Invalid return_url', { status: 400 });
        //     }
        
        //     // Check Snabbb session server-side — read .snabbb.com cookie
        //     const cookieHeader = request.headers.get('Cookie') || '';
        //     const sessionIds = [];
        //     const cookieRegex = /(?:^|;\s*)session_id=([^;]+)/gi;
        //     let m;
        //     while ((m = cookieRegex.exec(cookieHeader)) !== null) {
        //         sessionIds.push(m[1]);
        //     }
        
        //     console.log('[ambient-redirect] session IDs found:', sessionIds.length);
        
        //     // Try each session ID until one validates with Odoo
        //     let workingSessionId = null;
        //     for (const sid of [...sessionIds].reverse()) {
        //         const checkRes = await fetch('https://mrbur.odoo.com/web/session/get_session_info', {
        //             method: 'POST',
        //             headers: {
        //                 'Content-Type': 'application/json',
        //                 'Cookie': `session_id=${sid}`,
        //             },
        //             body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {}, id: 1 }),
        //         });
        //         const checkData = await checkRes.json().catch(() => null);
        //         console.log('[ambient-redirect] uid for sid:', checkData?.result?.uid);
        //         if (checkData?.result?.uid) {
        //             workingSessionId = sid;
        //             break;
        //         }
        //     }
        
        //     // Not logged in on Snabbb — redirect back to original URL unchanged
        //     if (!workingSessionId) {
        //         console.log('[ambient-redirect] no valid Snabbb session, redirecting back');
        //         return new Response(null, {
        //             status: 302,
        //             headers: {
        //                 'Location': returnUrl,
        //                 'Cache-Control': 'no-store',
        //             },
        //         });
        //     }
        
        //     console.log('[ambient-redirect] valid session found, generating token...');
        
        //     // Generate one-time SSO token
        //     const tokenRes = await fetch('https://mrbur.odoo.com/sso/generate_token', {
        //         method: 'POST',
        //         headers: {
        //             'Content-Type': 'application/json',
        //             'Cookie': `session_id=${workingSessionId}`,
        //         },
        //         body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
        //     });
        //     const tokenData = await tokenRes.json().catch(() => null);
        //     const token = tokenData?.result?.token;
        
        //     console.log('[ambient-redirect] token:', token ? 'received' : 'failed', tokenData);
        
        //     // Token generation failed — redirect back unchanged
        //     if (!token) {
        //         console.warn('[ambient-redirect] token generation failed:', JSON.stringify(tokenData));
        //         return new Response(null, {
        //             status: 302,
        //             headers: {
        //                 'Location': returnUrl,
        //                 'Cache-Control': 'no-store',
        //             },
        //         });
        //     }
        
        //     // Redirect to mrbur.shop/sso/callback with token
        //     const callbackUrl = new URL(parsedReturnUrl.origin);
        //     callbackUrl.pathname = '/sso/callback';
        //     callbackUrl.searchParams.set('token', token);
        
        //     console.log('[ambient-redirect] redirecting to callback:', callbackUrl.toString());
        
        //     return new Response(null, {
        //         status: 302,
        //         headers: {
        //             'Location': callbackUrl.toString(),
        //             'Cache-Control': 'no-store',
        //         },
        //     });
        // }

        if (url.pathname === "/api/web/reset_password") {
            if (request.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: corsHeaders });
            }
        
            const body = await request.text();
        
            const odooRes = await fetch("https://mrbur.odoo.com/mrbur/reset_password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    // Spoof the Host header to bypass website routing
                    "Host": "aht-systemadmin-mrbur-main-20994444.odoo.com",
                },
                body,
            });
        
            const data = await odooRes.text();
        
            return new Response(data, {
                status: odooRes.status,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            });
        }
        
        // ==============================
        // ✅ ODOO UI PROXY under your domain
        // https://app.snabbb.com/odoo/*    ->    https://mrbur.odoo.com/*
        // Goal: make Odoo session_id shared on Domain=.snabbb.com (NOT host-only)
        // ==============================
        if (url.pathname.startsWith("/odoo/")) {
            const UPSTREAM_ORIGIN = "https://mrbur.odoo.com";
            const COOKIE_NAME = "session_id";
            
            // Read cookies from browser
            const cookieHeader = request.headers.get("Cookie") || "";
            const cookies = Object.fromEntries(
                cookieHeader
                .split(";")
                .map((v) => v.trim())
                .filter(Boolean)
                .map((v) => {
                    const i = v.indexOf("=");
                    return i >= 0 ? [v.slice(0, i), v.slice(i + 1)] : [v, ""];
                })
            );
            
            const storedSession = cookies[COOKIE_NAME];
            
            // Map /odoo/* -> upstream /*
            const upstreamPath = url.pathname.replace("/odoo", ""); // keeps leading slash
            const upstreamUrl = new URL(UPSTREAM_ORIGIN + upstreamPath);
            upstreamUrl.search = url.search;
            
            // Build upstream headers (do NOT leak your domain cookies)
            const upstreamHeaders = new Headers(request.headers);
            upstreamHeaders.delete("Cookie");
            
            // Inject Odoo session if we already have it
            if (storedSession) {
                upstreamHeaders.set("Cookie", `session_id=${storedSession}`);
            }
            
            // Optional but helps some upstream setups
            upstreamHeaders.set("Host", new URL(UPSTREAM_ORIGIN).host);
            
            const upstreamRes = await fetch(upstreamUrl.toString(), {
                method: request.method,
                headers: upstreamHeaders,
                body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
                redirect: "manual",
            });
            
            const resHeaders = new Headers(upstreamRes.headers);
            
            // Rewrite redirects back to our /odoo/*
            const loc = resHeaders.get("Location");
            if (loc) {
                try {
                    const locUrl = new URL(loc, UPSTREAM_ORIGIN);
                    if (locUrl.origin === UPSTREAM_ORIGIN) {
                        resHeaders.set("Location", "/odoo" + locUrl.pathname + locUrl.search);
                    }
                } catch {}
            }
            
            // ---- Capture upstream session_id from Set-Cookie (may be null) ----
            const setCookie = upstreamRes.headers.get("Set-Cookie");
            const m = setCookie?.match(/(?:^|;\s*)session_id=([^;]+)/i);
            const newSessionId = m?.[1];
            
            // IMPORTANT:
            // 1) Remove upstream Set-Cookie so the browser DOES NOT store host-only cookies for app.snabbb.com
            resHeaders.delete("Set-Cookie");      // correct case
            resHeaders.delete("set-cookie");      // extra safety
            
            // 2) If we got a session_id, RE-ISSUE it as a shared cookie on .snabbb.com
            if (newSessionId) {
                // Clear any host-only cookie previously set on app.snabbb.com (cleanup)
                resHeaders.append(
                    "Set-Cookie",
                    `session_id=${newSessionId}; Path=/; Domain=.snabbb.com; Max-Age=0; HttpOnly; Secure; SameSite=None`
                );
                
                // Set shared cookie across all subdomains
                resHeaders.append("Set-Cookie", buildSharedOdooSessionCookie(newSessionId));
            }
            
            return new Response(upstreamRes.body, {
                status: upstreamRes.status,
                headers: resHeaders,
            });
        }
        
        /*=======================================
        ✅ SUPABASE CREATE AUTH USER
        =========================================*/
        if (url.pathname === "/api/auth/create-user" && request.method === "POST") {
            return handleCreateAuthUser(request, env);
        }

        /*=======================================
            ✅ SUPABASE JWT SIGNING
        =========================================*/
        if (url.pathname === "/api/sso/exchange" && request.method === "GET") {
            return handleSSO(request, env)
        }

        if (url.pathname === "/api/sso/check-snabbb-session") {
    const reqOrigin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": reqOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    const cookieHeader = request.headers.get("Cookie") || "";
    console.log("[check-snabbb-session] cookies received:", cookieHeader);
    
    const sessionIds = [];
    const cookieRegex = /(?:^|;\s*)session_id=([^;]+)/gi;
    let match;
    while ((match = cookieRegex.exec(cookieHeader)) !== null) {
        sessionIds.push(match[1]);
    }

    console.log("[check-snabbb-session] session IDs found:", sessionIds.length);

    for (const sid of [...sessionIds].reverse()) {
        console.log("[check-snabbb-session] trying sid:", sid.substring(0, 20));
        
        const res = await fetch("https://mrbur.odoo.com/web/session/get_session_info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Cookie": `session_id=${sid}`,
            },
            body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
        });

        const data = await res.json().catch(() => null);
        console.log("[check-snabbb-session] uid for sid:", data?.result?.uid, "error:", data?.error?.message);
        
        if (data?.result?.uid) {
            return new Response(JSON.stringify({ 
                result: { ...data.result, working_session_id: sid }
            }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": reqOrigin,
                    "Access-Control-Allow-Credentials": "true",
                },
            });
        }
    }

    return new Response(JSON.stringify({ result: { uid: false } }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": reqOrigin,
            "Access-Control-Allow-Credentials": "true",
        },
    });
}

        /* ==============================
            authenticate web session
        ================================= */
        if (url.pathname === "/api/web/session/authenticate") {
            if (request.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: corsHeaders });
            }
        
            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            }
        
            try {
                const body = await request.json();
            
                const login = body?.params?.login;
                const password = body?.params?.password;
            
                if (!login || !password) {
                    return new Response(JSON.stringify({ ok: false, error: "Missing email or password" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    });
                }
            
                const ODOO_BASE = "https://mrbur.odoo.com";
                const DB = "aht-systemadmin-mrbur-main-20994444";
            
                // ✅ ODOO AUTH (fixed: prevent host-only session_id + re-issue Domain=.snabbb.com)
                const upstream = await fetch(`${ODOO_BASE}/web/session/authenticate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "call",
                        params: { db: DB, login, password },
                        id: body?.id ?? 1,
                    }),
                });
                
                const data = await upstream.json().catch(() => null);

                if (!upstream.ok) {
                    return new Response(
                        JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstream.status, data }),
                        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                if (data?.error) {
                    return new Response(
                        JSON.stringify({ ok: false, error: data.error.message || "Odoo login failed", data }),
                        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                // ✅ Odoo success payload is in data.result
                const result = data?.result;

                // ✅ Read upstream cookie, extract session_id
                const upstreamSetCookie = upstream.headers.get("Set-Cookie");
                const newSessionId = parseSessionIdFromSetCookie(upstreamSetCookie);

                // ✅ Build response headers (DO NOT forward upstream Set-Cookie)
                const out = new Headers({
                    "Content-Type": "application/json",
                    ...corsHeaders,
                });

                // ✅ If we got a session_id, re-issue as shared cookie
                if (newSessionId) {
                    // (optional cleanup) delete host-only cookie on gallery
                    out.append(
                        "Set-Cookie",
                        `session_id=; Path=/; Domain=app.snabbb.com; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
                    );
                
                    // ✅ re-issue as shared cookie for ALL subdomains
                    const cookieDomain = getSessionCookieDomain(url.hostname);

                    out.append(
                        "Set-Cookie",
                        [
                            `session_id=${newSessionId}`,
                            "Path=/",
                            cookieDomain ? `Domain=${cookieDomain}` : "",
                            "HttpOnly",
                            "Secure",
                            "SameSite=None",
                            "Max-Age=21600",
                        ].filter(Boolean).join("; ")
                    );

                    out.append(
                        "Set-Cookie",
                        [
                            `session_id=${newSessionId}`,
                            "Path=/",
                            `Domain=.mrbur.shop`,
                            "HttpOnly",
                            "Secure",
                            "SameSite=Lax",
                            "Max-Age=21600",
                        ].join("; ")
                    );

                    out.append(
                        "Set-Cookie",
                        [
                            `session_id=${newSessionId}`,
                            "Path=/",
                            `Domain=.mrburstudio.com`,
                            "HttpOnly",
                            "Secure",
                            "SameSite=Lax",
                            "Max-Age=21600",
                        ].join("; ")
                    );
                    
                    return new Response(
                    JSON.stringify({
                        ok: true,
                        session_id: newSessionId,
                        sessionInfo: {
                            name: result?.name ?? result?.partner_display_name ?? "",
                            email: result?.username ?? login,
                            uid: result?.uid ?? null,
                            partner_id: result?.partner_id ?? null,
                            db: result?.db ?? DB,
                        },
                        data,
                    }),
                    {
                        status: 200,
                        headers: out,
                    }
                );
                }



                // ✅ Return response (no upstream Set-Cookie leakage)
                return new Response(
                    JSON.stringify({
                        ok: true,
                        sessionInfo: {
                            name: result?.name ?? result?.partner_display_name ?? "",
                            email: result?.username ?? login,
                            uid: result?.uid ?? null,
                            partner_id: result?.partner_id ?? null,
                            db: result?.db ?? DB,
                        },
                        data,
                    }),
                    {
                        status: 200,
                        headers: out,
                    }
                );
            } catch (err) {
                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo login failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }

        if (url.pathname === "/api/partner/profile" && request.method === "GET") {
            const email = url.searchParams.get("email");
            if (!email) return json({ ok: false, error: "Missing email" }, 400);

            try {
                const cookieHeader = request.headers.get("Cookie") || "";

                const profileRes = await fetch("https://mrbur.odoo.com/web/dataset/call_kw", { // ← was my.mrbur.shop
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Cookie": cookieHeader,
                    },
                    body: JSON.stringify({    // ← this was missing
                        jsonrpc: "2.0",
                        method: "call",
                        params: {
                            model: "res.partner",
                            method: "search_read",
                            args: [[["email", "=", email]]],
                            kwargs: {
                                fields: ["phone", "country_id", "x_date_of_birth", "image_128"],
                                limit: 1,
                            },
                        },
                        id: 1,
                    }),});

                    const profileJson = await profileRes.json().catch(() => null);
                    const partner = profileJson?.result?.[0] || null;

                        // Add this temporarily
                        if (!partner) {
                            return json({ 
                                ok: false, 
                                error: "Partner not found",
                                raw: profileRes,    // ← shows full Odoo response
                                email,
                            }, 404);
                        }
                if (!partner) return json({ ok: false, error: "Partner not found" }, 404);
            
                return json({
                    ok: true,
                    phone: partner.phone || null,
                    country_id: partner.country_id || null,
                    birthdate_date: partner.x_date_of_birth || null,
                    has_image: !!partner.image_128,
                    profileComplete: !!(
                        partner.phone &&
                        partner.country_id &&
                        partner.x_date_of_birth &&
                        partner.image_128
                    ),
                });
            } catch (e) {
                return json({ ok: false, error: e?.message || "Failed to fetch partner" }, 500);
            }
        }

    if (url.pathname === "/api/web/session/get_session_info") {
        const reqOrigin = request.headers.get("Origin") || "https://app.snabbb.com";
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": reqOrigin,
                    "Access-Control-Allow-Credentials": "true",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        const cookieHeader = request.headers.get("Cookie") || "";
    
        const res = await fetch("https://mrbur.odoo.com/web/session/get_session_info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": cookieHeader,
            },
            body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
        });

        const data = await res.json().catch(() => null);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            },
        });
    }

        /* =========================================================
              ✅ ODOO DEV REVERSE PROXY
              /api/web/*    →    https://mrbur-staging-bur-26090883.dev.odoo.com/web/*
              - forwards browser cookies (session_id)
              - avoids CORS pain by keeping same-origin
        ========================================================= */
        if (url.pathname.startsWith("/api/web/")) {
            const odooPath = url.pathname.replace("/api", ""); // "/web/..."
            const targetUrl = new URL(ODOO_DEV_BASE + odooPath);
            targetUrl.search = url.search;
                
            // Copy incoming headers, but remove/override risky ones
            const upstreamHeaders = new Headers(request.headers);
            upstreamHeaders.delete("Origin");
            upstreamHeaders.delete("Referer");
            upstreamHeaders.delete("X-SSO-API-KEY");
            upstreamHeaders.delete("X-Requested-With");
                
            // Ensure Host is correct (optional, but can help)
            upstreamHeaders.set("Host", ODOO_DEV_HOST);
                
            // For GET/HEAD: do NOT send Content-Type
            const method = request.method.toUpperCase();
            if (method === "GET" || method === "HEAD") {
                upstreamHeaders.delete("Content-Type");
            }
        
            // Timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000); // 15s
        
            let upstreamRes;
            try {
                upstreamRes = await fetch(targetUrl.toString(), {
                    method,
                    headers: upstreamHeaders,
                    body: method === "GET" || method === "HEAD" ? null : request.body, // ✅ stream
                    redirect: "manual",
                    signal: controller.signal,
                });
            } catch (e) {
                clearTimeout(timeout);
                return new Response(JSON.stringify({ ok: false, error: "odoo_upstream_timeout_or_network", details: String(e) }), {
                    status: 504,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } finally {
                clearTimeout(timeout);
            }
        
            const outHeaders = new Headers(upstreamRes.headers);
            // If upstream forgot content-type, set a safe default (don't force JSON always)
            if (!outHeaders.get("Content-Type")) {
                outHeaders.set("Content-Type", "text/plain");
            }

            // Add API CORS headers
            for (const [k, v] of Object.entries(corsHeaders)) outHeaders.set(k, v);

            // ✅ Rewrite session_id cookie domain to .snabbb.com
            const upstreamSetCookie = upstreamRes.headers.get("Set-Cookie");
            if (upstreamSetCookie) {
                const sessionIdMatch = upstreamSetCookie.match(/session_id=([^;]+)/i);
                if (sessionIdMatch) {
                    const sessionId = sessionIdMatch[1];
                    // Remove original Set-Cookie
                    outHeaders.delete("Set-Cookie");
                    // Re-issue with .snabbb.com domain
                    const cookieDomain = getSessionCookieDomain(url.hostname);

                    outHeaders.set(
                        "Set-Cookie",
                        [
                            `session_id=${sessionId}`,
                            "Path=/",
                            cookieDomain ? `Domain=${cookieDomain}` : "",
                            "HttpOnly",
                            "Secure",
                            "SameSite=Lax",
                            "Max-Age=21600",
                        ].filter(Boolean).join("; ")
                    );
                }
            }
        
            return new Response(upstreamRes.body, {
                status: upstreamRes.status,
                headers: outHeaders,
            });
        }

        // ==============================
        // ✅ API: POST /api/logout (clear cookie)
        // ==============================
        // if (url.pathname === "/api/logout" && request.method === "POST") {
        //      try {
        //          await fetch(`${ODOO_DEV_BASE}/web/session/destroy`, {
        //              method: "POST",
        //              headers: {
        //                  "Content-Type": "application/json",
        //                  Accept: "application/json",
        //                  // forward browser cookies (session_id)
        //                  Cookie: request.headers.get("Cookie") || "",
        //              },
        //              body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
        //          });
        //      } catch (e) {
        //          // ignore - we still clear our cookie below
        //      }
            
        //      return new Response(JSON.stringify({ ok: true }), {
        //          status: 200,
        //          headers: {
        //              "Content-Type": "application/json",
        //              "Set-Cookie": buildClearCookie(),
        //              ...corsHeaders,
        //          },
        //      });
        // }

        /* ==============================
              ✅ API: POST /api/register
              - creates user in Odoo AND Supabase
              - accepts payload like:
                  {
                      email, password,
                      options: { data: { name, phone, position, account_type, company_name } }
                  }
        ============================== */
        if (url.pathname === "/api/inventory/register") {
            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            }
        
            let body;
            try {
                body = await request.json();
            } catch {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        
            // ✅ Normalize payload (your current shape)
            const payload = body?.data ?? body?.options?.data ?? body ?? {};
        
            const email = body?.email ?? payload?.email ?? payload?.login;
            const password = body?.password ?? payload?.password;
            const name = payload?.name ?? body?.name;
        
            const phone = payload?.phone ?? body?.phone;
            const accountType = payload?.account_type ?? payload?.accountType;
            const companyName = payload?.company_name ?? payload?.companyName;
        
            // you use "position" in frontend
            const jobPosition = payload?.position ?? payload?.jobPosition ?? payload?.job_position;
        
            if (!email || !name || !password) {
                return new Response(JSON.stringify({ ok: false, error: "email, name, and password are required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        
            // ✅ Guards
            if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
                return new Response(JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        
            const adminHeaders = {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            };
        
            // Small helper to parse upstream json
            async function safeJson(res) {
                const text = await res.text();
                try { return { json: JSON.parse(text), text }; } catch { return { json: null, text }; }
            }
        
            try {
                // =====================================================
                // 1) ✅ Create user in ODOO (source of truth)
                // =====================================================
                console.log("CF country:", request.cf?.country);
                console.log("CF-IPCountry:", request.headers.get("CF-IPCountry"));
                console.log("Assigned company_id:", getCompanyIdFromRequest(request));

                const odooRequestData = {
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        email,
                        name,
                        password,
                        company_id: getCompanyIdFromRequest(request),
                        ...(phone ? { phone } : {}),
                        ...(jobPosition ? { job_position: jobPosition } : {}),
                        ...(accountType ? { account_type: accountType } : {}),
                        ...(companyName ? { company_name: companyName } : {}),
                    },
                    id: 1,
                };
            
                const odooRes = await fetch("https://mrbur.odoo.com/api/v1/users", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                    },
                    body: JSON.stringify(odooRequestData),
                });
            
                const { json: odooJson, text: odooText } = await safeJson(odooRes);
            
                // Odoo can respond ok:200 but with result.ok=false
                if (!odooRes.ok || odooJson?.error || odooJson?.result?.ok === false) {
                    const errMsg =
                        odooJson?.error?.message ||
                        odooJson?.result?.error ||
                        `Odoo create user failed (HTTP ${odooRes.status})`;
                
                    // if Odoo says user already exists, we still proceed to create Supabase user
                    const maybeExists = String(errMsg).toLowerCase().includes("exist");
                    if (!maybeExists) {
                        return new Response(
                            JSON.stringify({ ok: false, error: errMsg, details: odooJson || odooText }),
                            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                        );
                    }
                }
            
                // Try extract Odoo user id if your endpoint returns it
                const odooUserId = odooJson?.result?.user_id ?? odooJson?.result?.id ?? null;
            
                // =====================================================
                // 2) ✅ Ensure user exists in SUPABASE Auth (admin)
                // =====================================================
                // First attempt: create user
                const sbCreateRes = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users`, {
                    method: "POST",
                    headers: adminHeaders,
                    body: JSON.stringify({
                        email,
                        password,                  // ⚠️ if you want SSO-only, replace with random password
                        email_confirm: true,
                        user_metadata: {
                            name,
                            phone: phone || null,
                            account_type: accountType || null,
                            position: jobPosition || null,
                            company_name: companyName || null,
                            odoo_user_id: odooUserId,
                            sso: "odoo",
                        },
                    }),
                });
            
                const { json: sbJson, text: sbText } = await safeJson(sbCreateRes);
            
                // If already exists, lookup user id (fallback listing)
                let supabaseUserId = sbJson?.id || sbJson?.user?.id || null;
            
                if (!sbCreateRes.ok) {
                    const msg = (sbJson?.message || sbJson?.error_description || sbJson?.error || sbText || "").toString();
                    const alreadyExists =
                        msg.toLowerCase().includes("already") ||
                        msg.toLowerCase().includes("exists") ||
                        msg.toLowerCase().includes("registered") ||
                        msg.toLowerCase().includes("duplicate");
                
                    if (!alreadyExists) {
                        return new Response(
                            JSON.stringify({ ok: false, error: "Supabase create user failed", details: sbJson || sbText }),
                            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                        );
                    }
                
                    // Lookup user by scanning admin list pages (same technique you use elsewhere)
                    let page = 1;
                    while (page <= 5 && !supabaseUserId) {
                        const listRes = await fetch(
                            `${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users?page=${page}&per_page=200`,
                            { headers: adminHeaders }
                        );
                    
                        const { json: listJson } = await safeJson(listRes);
                        const users = Array.isArray(listJson) ? listJson : (listJson?.users || []);
                        const match = users?.find((u) => (u?.email || "").toLowerCase() === email.toLowerCase());
                        if (match?.id) supabaseUserId = match.id;
                        page++;
                    }
                
                    if (!supabaseUserId) {
                        return new Response(
                            JSON.stringify({ ok: false, error: "Supabase user exists but lookup failed", details: sbJson || sbText }),
                            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
                        );
                    }
                
                    // Optional: update metadata on existing user
                    await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users/${supabaseUserId}`, {
                        method: "PUT",
                        headers: adminHeaders,
                        body: JSON.stringify({
                            user_metadata: {
                                name,
                                phone: phone || null,
                                account_type: accountType || null,
                                position: jobPosition || null,
                                company_name: companyName || null,
                                odoo_user_id: odooUserId,
                                sso: "odoo",
                            },
                        }),
                    }).catch(() => {});
                }
            
                return new Response(
                    JSON.stringify({
                        ok: true,
                        odoo: { user_id: odooUserId, raw: odooJson?.result ?? odooJson ?? null },
                        supabase: { user_id: supabaseUserId },
                    }),
                    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: e?.message || "register_failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }
        
        // POST /api/snabbb/consume
        if (url.pathname === "/api/snabbb/consume") {
            if (request.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: corsHeaders });
            }
        
            if (request.method !== "POST") {
                return new Response(
                    JSON.stringify({ ok: false, error: "Method Not Allowed" }),
                    {
                        status: 405,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    }
                );
            }
        
            try {
                const body = await request.json();
            
                const upstreamUrl = `${ODOO_BASE_URL}/snabbb/api/consume`;
            
                const odooRes = await fetch(upstreamUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Snabbb-Api-Key": SNABBB_API_KEY,
                    },
                    body: JSON.stringify({
                        partner_id: body.partner_id,
                        app_code: body.app_code,
                        feature_code: body.feature_code,
                        external_ref: body.external_ref,
                    }),
                });
            
                const rawText = await odooRes.text();
            
                let result;
                try {
                    result = JSON.parse(rawText);
                } catch {
                    result = {
                        ok: false,
                        upstream_status: odooRes.status,
                        upstream_raw: rawText,
                    };
                }
            
                return new Response(JSON.stringify(result), {
                    status: odooRes.status,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                });
            } catch (err) {
                return new Response(
                    JSON.stringify({
                        ok: false,
                        error: err?.message || "unknown_error",
                    }),
                    {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json",
                            ...corsHeaders,
                        },
                    }
                );
            }
        }

            // In your existing Cloudflare Worker
            if (url.pathname === '/api/snabbb/wallet') {
                const partnerId = url.searchParams.get('partner_id')
                if (!partnerId) {
                    return new Response(JSON.stringify({ error: 'missing partner_id' }), { status: 400 })
                }
            
                const odooRes = await fetch('https://mrbur.odoo.com/web/dataset/call_kw', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Forward the session cookie from the browser
                        'Cookie': request.headers.get('Cookie') || '',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'call',
                        id: 1,
                        params: {
                            model: 'snabbb.wallet',
                            method: 'search_read',
                            args: [[['partner_id', '=', parseInt(partnerId)]]],
                            kwargs: { fields: ['snabbb_balance'], limit: 1 },
                        },
                    }),
                })
            
                const data = await odooRes.json()
                const balance = data.result?.[0]?.snabbb_balance ?? 0
            
                return new Response(JSON.stringify({ balance }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': 'https://app.snabbb.com',
                        'Access-Control-Allow-Credentials': 'true',
                    },
                })
            }

            const isUnifiedShopCheckout = url.pathname.startsWith('/api/unified-shop/checkout/');
            
            if (isUnifiedShopCheckout) {
              const forwarded = new Request(ODOO_DEV_HOST + url.pathname + url.search, {
                method: request.method,
                headers: request.headers, // preserves the session cookie
                body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
                redirect: 'manual',
              });
              const resp = await fetch(forwarded);
              return resp;
            }

        /* ==============================
              ✅ API: POST /api/inventory/sign-up
              - forwards JSON-RPC payload to Odoo /api/v1/users
              - same as authOdoo() in frontend
        ============================== */
        if (url.pathname === "/api/inventory/sign-up") {
            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            }
        
            let body;
            try {
                body = await request.json();
            } catch {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        
            // Accept either direct fields or already-built JSON-RPC body
            const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};

            const email = body?.email ?? payload?.email ?? payload?.login;
            const name = payload?.name ?? body?.name; // keep fallback if you sometimes send body.name
            const password = payload?.password ?? body?.password;
            const phone = payload?.phone ?? body?.phone;
                    
            // your field is "position", but your Worker expects jobPosition/job_position
            const jobPosition = payload?.position ?? payload?.jobPosition ?? body?.jobPosition ?? payload?.job_position;
                    
            if (!email || !name) {
                return new Response(JSON.stringify({ ok: false, error: "email and name are required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
            
            const requestData = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    email,
                    name,
                    ...(password ? { password } : {}),
                    company_id: getCompanyIdFromRequest(request), 
                    ...(jobPosition ? { job_position: jobPosition } : {}),
                    ...(phone ? { phone } : {}),
                },
                id: 1,
            };
        
            try {
                const upstreamUrl = "https://mrbur.odoo.com/api/v1/users"; // your real target
            
                const upstreamRes = await fetch(upstreamUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-SSO-API-KEY": env.ODOO_SSO_API_KEY, // keep if Odoo requires it
                    },
                    body: JSON.stringify(requestData),
                });
            
                const text = await upstreamRes.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { raw: text };
                }
            
                // Mirror your frontend: if response.data.error -> throw
                if (data?.error) {
                    return new Response(
                        JSON.stringify({ ok: false, error: data.error?.message || "Odoo error", details: data.error }),
                        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }
            
                if (!upstreamRes.ok) {
                    return new Response(
                        JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstreamRes.status, data }),
                        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }
            
                return new Response(JSON.stringify({ ok: true, data }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } catch (err) {
                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo login failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }

          /* ==============================
                    ✅ APPOINTMENT SIGNUP
                ============================== */
                if (url.pathname === "/api/appointment/sign-up") {
                        if (request.method !== "POST") {
                                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
                        }

                        let body;
                        try {
                                body = await request.json();
                        } catch {
                                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                                        status: 400,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        }

                        // Accept either direct fields or already-built JSON-RPC body
                        const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};

                        const email = body?.email ?? payload?.email ?? payload?.login;
                        const name = payload?.name ?? body?.name; // keep fallback if you sometimes send body.name
                        const password = payload?.password ?? body?.password;
                        const phone = payload?.phone ?? body?.phone;

                        if (!email || !name) {
                                return new Response(JSON.stringify({ ok: false, error: "email and name are required" }), {
                                        status: 400,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        }

                        // Map fields for the Appointment App (use realistic company_id if needed)
                        const requestData = {
                                jsonrpc: "2.0",
                                method: "call",
                                params: {
                                        email,
                                        name,
                                        ...(password ? { password } : {}),
                                        company_id: getCompanyIdFromRequest(request),    // Make sure this is correct for appointments
                                        ...(phone ? { phone } : {}),
                                },
                                id: 1,
                        };

                        try {
                                const upstreamUrl = "https://mrbur.odoo.com/api/v1/users";

                                const upstreamRes = await fetch(upstreamUrl, {
                                        method: "POST",
                                        headers: {
                                                "Content-Type": "application/json",
                                                Accept: "application/json",
                                                "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                                        },
                                        body: JSON.stringify(requestData),
                                });

                                const text = await upstreamRes.text();
                                let data;
                                try {
                                        data = JSON.parse(text);
                                } catch {
                                        data = { raw: text };
                                }

                                if (data?.error) {
                                        return new Response(
                                                JSON.stringify({ ok: false, error: data.error?.message || "Odoo error", details: data.error }),
                                                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                                        );
                                }

                                if (!upstreamRes.ok) {
                                        return new Response(
                                                JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstreamRes.status, data }),
                                                { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
                                        );
                                }

                                return new Response(JSON.stringify({ ok: true, data }), {
                                        status: 200,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        } catch (err) {
                                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo login failed" }), {
                                        status: 500,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        }
                }

                
        /* ==============================
                    ✅ IMAGEAI SIGNUP
                ============================== */
        if (url.pathname === "/api/imageai/sign-up") {
            const imageAiCorsHeaders = {
                ...corsHeaders,
                "Access-Control-Allow-Origin": allowedOrigins.has(origin)
                    ? origin
                    : "https://imageai.snabbb.com",
            };

            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: imageAiCorsHeaders });
            }

            let body;
            try {
                body = await request.json();
            } catch {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...imageAiCorsHeaders },
                });
            }

            const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};

            const email = body?.email ?? payload?.email ?? payload?.login;
            const name = payload?.name ?? body?.name;
            const password = payload?.password ?? body?.password;
            const phone = payload?.phone ?? body?.phone;
            const company_name = payload?.company_name ?? payload?.companyName ?? body?.company_name;
            const company_id = payload?.company_id ?? body?.company_id ?? 2;
            const jobPosition =
                payload?.position ??
                payload?.jobPosition ??
                body?.jobPosition ??
                payload?.job_position;

            if (!email || !name) {
                return new Response(JSON.stringify({ ok: false, error: "email and name are required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...imageAiCorsHeaders },
                });
            }

            const requestData = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    email,
                    name,
                    ...(password ? { password } : {}),
                    ...(phone ? { phone } : {}),
                    ...(jobPosition ? { job_position: jobPosition } : {}),
                    ...(company_name ? { company_name } : {}),
                    ...(company_id ? { company_id } : {}),
                },
                id: body?.id ?? 1,
            };

            try {
                const upstreamUrl = "https://mrbur.odoo.com/api/v1/users";

                const upstreamRes = await fetch(upstreamUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                    },
                    body: JSON.stringify(requestData),
                });

                const text = await upstreamRes.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { raw: text };
                }

                if (data?.error) {
                    const errMsg = data.error.data?.message || data.error.message || "Odoo error";
                    return new Response(
                        JSON.stringify({ ok: false, error: errMsg, details: data.error }),
                        { status: 400, headers: { "Content-Type": "application/json", ...imageAiCorsHeaders } }
                    );
                }

                if (!upstreamRes.ok) {
                    return new Response(
                        JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstreamRes.status, data }),
                        { status: 502, headers: { "Content-Type": "application/json", ...imageAiCorsHeaders } }
                    );
                }

                return new Response(JSON.stringify({ ok: true, data }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...imageAiCorsHeaders },
                });
            } catch (err) {
                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo sign-up failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...imageAiCorsHeaders },
                });
            }
        }        

        /* ==============================
                    IMAGEAI SESSION INFO
                    (proxies Odoo get_session_info for imageai.snabbb.com --
                    used client-side to resolve partner_id for the Snabbb
                    wallet balance lookup. Dedicated + explicitly namespaced,
                    mirroring /api/imageai/sign-up above, rather than relying
                    solely on the generic /api/web/session/get_session_info
                    handler further up in this file.)
                ============================== */
        if (url.pathname === "/api/imageai/session-info") {
            const imageAiCorsHeaders = {
                ...corsHeaders,
                "Access-Control-Allow-Origin": allowedOrigins.has(origin)
                    ? origin
                    : "https://imageai.snabbb.com",
            };

            if (request.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: imageAiCorsHeaders });
            }

            if (request.method !== "POST" && request.method !== "GET") {
                return new Response("Method Not Allowed", { status: 405, headers: imageAiCorsHeaders });
            }

            const cookieHeader = request.headers.get("Cookie") || "";

            try {
                const res = await fetch("https://mrbur.odoo.com/web/session/get_session_info", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Cookie": cookieHeader,
                    },
                    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
                });

                const data = await res.json().catch(() => null);

                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...imageAiCorsHeaders },
                });
            } catch (err) {
                return new Response(
                    JSON.stringify({ ok: false, error: err?.message || "Failed to fetch session info" }),
                    { status: 500, headers: { "Content-Type": "application/json", ...imageAiCorsHeaders } }
                );
            }
        }

        /* ==============================
                    ✅ E-LEARNING SIGNUP
                ============================== */
                if (url.pathname === "/api/e-learning/sign-up") {
                        if (request.method !== "POST") {
                                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
                        }

                        let body;
                        try {
                                body = await request.json();
                        } catch {
                                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                                        status: 400,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        }

                        // Accept either direct fields or already-built JSON-RPC body
                        const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};

                        const email = body?.email ?? payload?.email ?? payload?.login;
                        const name = payload?.name ?? body?.name;
                        const password = payload?.password ?? body?.password;
                        const phone = payload?.phone ?? body?.phone;

                        if (!email || !name) {
                                return new Response(JSON.stringify({ ok: false, error: "email and name are required" }), {
                                        status: 400,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        }

                        const requestData = {
                                jsonrpc: "2.0",
                                method: "call",
                                params: {
                                        email,
                                        name,
                                        ...(password ? { password } : {}),
                                        company_id: getCompanyIdFromRequest(request),
                                        ...(phone ? { phone } : {}),
                                },
                                id: 1,
                        };

                        try {
                                const upstreamUrl = "https://mrbur.odoo.com/api/v1/users";

                                const upstreamRes = await fetch(upstreamUrl, {
                                        method: "POST",
                                        headers: {
                                                "Content-Type": "application/json",
                                                Accept: "application/json",
                                                "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                                        },
                                        body: JSON.stringify(requestData),
                                });

                                const text = await upstreamRes.text();
                                let data;
                                try {
                                        data = JSON.parse(text);
                                } catch {
                                        data = { raw: text };
                                }

                                if (data?.error) {
                                        return new Response(
                                                JSON.stringify({ ok: false, error: data.error?.message || "Odoo error", details: data.error }),
                                                { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                                        );
                                }

                                if (!upstreamRes.ok) {
                                        return new Response(
                                                JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstreamRes.status, data }),
                                                { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
                                        );
                                }

                                return new Response(JSON.stringify({ ok: true, data }), {
                                        status: 200,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        } catch (err) {
                                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo signup failed" }), {
                                        status: 500,
                                        headers: { "Content-Type": "application/json", ...corsHeaders },
                                });
                        }
                }

        /* ==============================
                    ✅ HIRING SIGNUP
                ============================== */
        if (url.pathname === "/api/hiring/sign-up") {
            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            }

            let body;
            try {
                body = await request.json();
            } catch {
                return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            // Accept either direct fields or already-built JSON-RPC body
            const payload = body?.data ?? body?.options?.data ?? body?.params ?? body ?? {};

            const email = body?.email ?? payload?.email ?? payload?.login;
            const name = payload?.name ?? body?.name;
            const password = payload?.password ?? body?.password;
            const phone = payload?.phone ?? body?.phone;
            const company_name = payload?.company_name ?? body?.company_name;
            const company_id = payload?.company_id ?? body?.company_id;

            if (!email || !name) {
                return new Response(JSON.stringify({ ok: false, error: "email and name are required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            // Map fields for the Hiring App
            const requestData = {
                jsonrpc: "2.0",
                method: "call",
                params: {
                    email,
                    name,
                    ...(password ? { password } : {}),
                    ...(phone ? { phone } : {}),
                    ...(company_name ? { company_name } : {}),
                    ...(company_id ? { company_id } : {}),
                },
                id: body?.id ?? 1,
            };

            try {
                const upstreamUrl = "https://mrbur.odoo.com/api/v1/users";

                const upstreamRes = await fetch(upstreamUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                    },
                    body: JSON.stringify(requestData),
                });

                const text = await upstreamRes.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { raw: text };
                }

                if (data?.error) {
                    const errMsg = data.error.data?.message || data.error.message || "Odoo error";
                    return new Response(
                        JSON.stringify({ ok: false, error: errMsg, details: data.error }),
                        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                if (!upstreamRes.ok) {
                    return new Response(
                        JSON.stringify({ ok: false, error: "Upstream Odoo error", status: upstreamRes.status, data }),
                        { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
                    );
                }

                return new Response(JSON.stringify({ ok: true, data }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } catch (err) {
                return new Response(JSON.stringify({ ok: false, error: err?.message || "Odoo sign-up failed" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }

        // ==============================
        // ✅ API: GET /api/me (check login quick)
        // ==============================
        if (url.pathname === "/api/me" && request.method === "GET") {
            const token = getTokenFromRequest(request);
            if (!token) {
                return new Response(JSON.stringify({ loggedIn: false, user: null }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const decoded = decodeAndValidateToken(token);
            if (!decoded.ok) {
                return new Response(JSON.stringify({ loggedIn: false, user: null }), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        // optional: clear cookie if expired/invalid
                        ...(decoded.error === "expired" || decoded.error === "invalid_token"
                            ? { "Set-Cookie": buildClearCookie() }
                            : {}),
                        ...corsHeaders,
                    },
                });
            }

            // You can return minimal identity info
            return new Response(
                JSON.stringify({
                    loggedIn: true,
                    user: { email: decoded.email, aud: decoded.payload?.aud || null },
                }),
                { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

    // ==============================
    // ✅ API: GET /api/supabase-session
    // - reads mrbur_sso cookie (HttpOnly)
    // - ensures a Supabase Auth user exists
    // - rotates password (no storage needed)
    // - uses password grant to mint access/refresh tokens
    // ==============================
        if (url.pathname === "/api/supabase-session" && request.method === "GET") {
            const debug = (step, extra = {}) =>
        console.log(JSON.stringify({ tag: "supabase-session", step, ...extra }));

        const readJson = async (res) => {
            const txt = await res.text();
            try { return { json: JSON.parse(txt), text: txt }; }
            catch { return { json: null, text: txt }; }
        };

        debug("keys_check", {
            hasUrl: !!env.SUPABASE_URL,
            anonKeyPrefix: (env.SUPABASE_ANON_KEY || "").slice(0, 14),
            serviceKeyPrefix: (env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 9),
        });


        const token = getTokenFromRequest(request); // reads mrbur_sso cookie
        if (!token) {
            return new Response(JSON.stringify({ ok: false, error: "missing_sso_cookie" }), {
                status: 401,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
    
        const decoded = decodeAndValidateToken(token);
        if (!decoded.ok) {
            return new Response(JSON.stringify({ ok: false, error: decoded.error }), {
                status: 401,
                headers: {
                    "Content-Type": "application/json",
                    ...(decoded.error === "expired" ? { "Set-Cookie": buildClearCookie() } : {}),
                    ...corsHeaders,
                },
            });
        }
        
        const email = decoded.email;
        const newPassword = crypto.randomUUID() + crypto.randomUUID();
        console.log("[supabase-session] keys check", {
            hasUrl: !!env.SUPABASE_URL,
            anonKeyPrefix: (env.SUPABASE_ANON_KEY || "").slice(0, 14),
            serviceKeyPrefix: (env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 10),
        });
    
        try {
            const adminHeaders = {
                apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            };
        
            // ---- 1) Find user (best-effort) ----
            let userId = null;
        
            // Try the email filter (may or may not work)
            try {
                const findUrl = `${env.SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
                const findRes = await fetch(findUrl, { headers: adminHeaders });
                if (findRes.ok) {
                    const found = await findRes.json().catch(() => null);
                    const users = Array.isArray(found) ? found : (found?.users || []);
                    userId = users?.[0]?.id || null;
                }
            } catch (_) {}
        
            // ---- 2) Create user if missing ----
            if (!userId) {
                const createRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users`, {
                    method: "POST",
                    headers: adminHeaders,
                    body: JSON.stringify({
                        email,
                        password: newPassword,
                        email_confirm: true,
                        user_metadata: {
                            sso: "odoo",
                            odoo_sub: decoded.payload?.sub ?? null,
                        },
                    }),
                });
            
                const created = await createRes.json().catch(() => null);
            
                if (!createRes.ok) {
                    // If user already exists, Supabase can return 400 in some setups
                    // Fall back to listing users and finding by email
                    const msg = JSON.stringify(created || {});
                    const alreadyExists =
                        msg.includes("already") ||
                        msg.includes("exists") ||
                        msg.includes("User already registered") ||
                        msg.includes("email");
                
                    if (!alreadyExists) {
                        return new Response(
                            JSON.stringify({ ok: false, error: "create_user_failed", details: created }),
                            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
                        );
                    }
                
                    // fallback list + search (pagination)
                    let page = 1;
                    while (page <= 5 && !userId) {
                        const listRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=200`, {
                            headers: adminHeaders,
                        });
                        const list = await listRes.json().catch(() => null);
                        const users = Array.isArray(list) ? list : (list?.users || []);
                        const match = users?.find((u) => (u?.email || "").toLowerCase() === email.toLowerCase());
                        if (match?.id) userId = match.id;
                        page++;
                    }
                
                    if (!userId) {
                        return new Response(
                            JSON.stringify({ ok: false, error: "user_lookup_failed_after_exists", details: created }),
                            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
                        );
                    }
                } else {
                    userId = created?.id || created?.user?.id || null;
                    if (!userId) {
                        return new Response(
                            JSON.stringify({ ok: false, error: "create_user_missing_id", details: created }),
                            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
                        );
                    }
                }
            }
        
            // ---- 3) Rotate password (PUT update) ----
            const updRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
                method: "PUT",
                headers: adminHeaders,
                body: JSON.stringify({
                    password: newPassword,
                    email_confirm: true,
                }),
            });
        
            if (!updRes.ok) {
                const upd = await updRes.json().catch(() => null);
                return new Response(
                    JSON.stringify({ ok: false, error: "update_user_failed", details: upd }),
                    { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            }

            await syncOdooInternalAdminStatus(
                env,
                userId,
                decoded.payload?.is_internal_user
            );
        
            // ---- 4) Password grant to mint real session ----
            let tokenRes;
            let rawText = null;
            let session = null;

            try {
                const supaJwt = await signHS256({
                    header: { alg: "HS256", typ: "JWT" },
                    payload: buildSupabaseJwtPayload({
                        sub: userId || decoded.payload?.sub || email,
                        email,
                        expSeconds: 3600,
                        extra: { user_id: userId, provider: "odoo_sso" },
                    }),
                    secret: env.SUPABASE_JWT_SECRET,
                });

                return new Response(JSON.stringify({ ok: true, access_token: supaJwt, token_type: "bearer", expires_in: 3600 }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
                });
            } catch (networkError) {
                console.log("[supabase] token_fetch_network_error", networkError);
                return new Response(
                    JSON.stringify({ ok: false, error: "network_error", details: networkError?.message }),
                    { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            }

            // Read raw response first
            try {
                rawText = await tokenRes.text();
            } catch (e) {
                rawText = null;
            }

            // Try parse JSON
            try {
                session = rawText ? JSON.parse(rawText) : null;
            } catch {
                session = null;
            }

            console.log("[supabase] token_exchange_result", {
                status: tokenRes.status,
                ok: tokenRes.ok,
                raw: rawText?.slice(0, 300), // safe truncate
            });

            if (!tokenRes.ok) {
                return new Response(
                    JSON.stringify({
                        ok: false,
                        error: "token_exchange_failed",
                        status: tokenRes.status,
                        details: session || rawText,
                    }),
                    {
                        status: 401,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    }
                );
            }
        
            return new Response(
                JSON.stringify({
                    ok: true,
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_in: session.expires_in,
                    token_type: session.token_type,
                    user: session.user,
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        "Cache-Control": "no-store",
                        ...corsHeaders,
                    },
                }
            );
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: e?.message || "unknown_error" }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
    }

        /* ==============================
      SSO: Get app launch link (proxy to Odoo)
      POST /api/v1/sso/app_link
      - appends company_code + company_id from Odoo session
      ================================= */
      if (url.pathname === "/api/v1/sso/userid") {
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (request.method !== "POST") {
            return new Response("Method Not Allowed", {
                status: 405,
                headers: corsHeaders,
            });
        }

        try {
            const bodyText = await request.text();
            const upstreamUrl = "https://mrbur.odoo.com/api/v1/sso/userid";

            const upstreamRes = await fetch(upstreamUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                },
                body: bodyText,
            });

            const upstreamJson = await upstreamRes.json().catch(() => null);

            if (!upstreamRes.ok || !upstreamJson?.result?.url) {
                return new Response(
                    JSON.stringify(upstreamJson || { ok: false, error: "userid_failed" }),
                    {
                        status: upstreamRes.status || 500,
                        headers: {
                            "Content-Type": "application/json",
                            ...corsHeaders,
                        },
                    }
                );
            }

            /**
              * Try to find the SSO token.
              * Prefer direct token fields from Odoo.
              * Fallback: extract token from result.url if Odoo puts it there.
              */
            let ssoToken =
                upstreamJson?.result?.token ||
                upstreamJson?.result?.sso_token ||
                upstreamJson?.token ||
                upstreamJson?.sso_token ||
                null;

            if (!ssoToken && upstreamJson?.result?.url) {
                try {
                    const launchUrl = new URL(upstreamJson.result.url);
                    ssoToken =
                        launchUrl.searchParams.get("token") ||
                        launchUrl.searchParams.get("sso_token") ||
                        launchUrl.searchParams.get("mrbur_sso") ||
                        null;
                } catch {
                    ssoToken = null;
                }
            }

            const resHeaders = new Headers({
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                ...corsHeaders,
            });

            /**
              * Set mrbur_sso cookie.
              * buildSetCookie defaults to COOKIE_NAME, which is "mrbur_sso".
              */
            if (ssoToken) {
                resHeaders.append(
                    "Set-Cookie",
                    buildSetCookie({
                        value: ssoToken,
                        domain: ".snabbb.com",
                        maxAge: 60 * 60,
                    })
                );
            }

            return new Response(
                JSON.stringify({
                    ...upstreamJson,
                    mrbur_sso_set: !!ssoToken,
                }),
                {
                    status: 200,
                    headers: resHeaders,
                }
            );
        } catch (err) {
            return new Response(
                JSON.stringify({ ok: false, error: err?.message || "userid_failed" }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        }
    }


      if (url.pathname === "/api/v1/sso/app_link") {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ✅ GET variant: server-side-redirecting app launcher, reusing this
    // exact literal path because it's PROVEN bound to this Worker in
    // production (confirmed live: GET here with no app_code returns this
    // script's own 405, not Cloudflare Pages' 200 SPA shell -- unlike the
    // brand-new /api/launch/* and /api/sso/launch/* paths tried earlier,
    // which silently fell through because Cloudflare's route config only
    // covers an explicit list of exact paths, not a /api/* or /api/sso/*
    // wildcard). Called directly from the frontend's click handler as:
    //   window.open("https://app.snabbb.com/api/v1/sso/app_link?app_code=shop", "_blank")
    // with no fetch beforehand, avoiding the "open blank tab, fetch, then
    // relocate it later" pattern that Chrome's Enhanced Safe Browsing can
    // silently block (leaving the tab stuck at about:blank).
    if (request.method === "GET") {
        const launchAppCode = (url.searchParams.get("app_code") || "").trim();
        if (launchAppCode) {
            return await handleAppLaunchRedirect(request, env, launchAppCode);
        }
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const sessionId = getCookie(request, "session_id");

    async function getSessionInfoForAppLink() {
        try {
            const cookieHeader = request.headers.get("Cookie") || "";
            if (!cookieHeader.includes("session_id=")) {
                console.log("[app_link] no session_id cookie found");
                return null;
            }

            const res = await fetchWithTimeout("https://app.snabbb.com/api/web/session/get_session_info", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Cookie: cookieHeader,
                },
            }, 4000);

            const rawBody = await res.clone().text();
            console.log("[app_link] get_session_info status:", res.status);
            console.log("[app_link] get_session_info body:", rawBody);

            if (!res.ok) return null;

            const data = await res.json().catch(() => null);
            return data?.result || data || null;
        } catch (e) {
            console.log("[app_link] get_session_info error:", e?.message || String(e));
            return null;
        }
    }

    function pickPrimaryCompany(sessionInfo) {
        const companyCodes = sessionInfo?.company_codes || {};

        // 1) Try Odoo active/default company first
        const defaultCompanyId =
            sessionInfo?.company_id?.[0] ||              // common Odoo format: [id, name]
            sessionInfo?.company_id ||                      // fallback: direct id
            sessionInfo?.user_company_id ||            // possible custom/session format
            sessionInfo?.current_company_id ||      // possible custom/session format
            null;

        if (defaultCompanyId && companyCodes[String(defaultCompanyId)]) {
            return {
                companyId: String(defaultCompanyId),
                companyCode: String(companyCodes[String(defaultCompanyId)] || "")
                    .trim()
                    .toUpperCase(),
            };
        }

        // 2) Fallback to allowed companies only if default company is unavailable
        const entries = Object.entries(companyCodes);
        if (!entries.length) return null;

        const [companyId, companyCode] = entries[0];

        return {
            companyId: String(companyId),
            companyCode: String(companyCode || "").trim().toUpperCase(),
        };
    }

    try {
        const bodyText = await request.text();
        const upstreamUrl = "https://mrbur.odoo.com/api/v1/sso/app_link";

        const upstreamRes = await fetchWithTimeout(upstreamUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
            },
            body: bodyText,
        }, 6000);

        const upstreamJson = await upstreamRes.json().catch(() => null);

        if (!upstreamRes.ok || !upstreamJson?.result?.url) {
            return new Response(
                JSON.stringify(upstreamJson || { ok: false, error: "app_link_failed" }),
                {
                    status: upstreamRes.status || 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders,
                    },
                }
            );
        }

        let finalUrl = String(upstreamJson.result.url || "")
            .replace(/https:\/\/sso\.mrburstudio\.com/gi, "https://sso.snabbb.com");

        const sessionInfo = await getSessionInfoForAppLink();
        console.log("[app_link] sessionInfo:", JSON.stringify(sessionInfo));

        // ✅ put it HERE
        const headerCompanyCode = (request.headers.get("X-Company-Code") || "").trim().toUpperCase();
        const headerCompanyId = (request.headers.get("X-Company-Id") || "").trim();

        let primaryCompany = null;

        if (headerCompanyCode && headerCompanyId) {
            primaryCompany = {
                companyCode: headerCompanyCode,
                companyId: headerCompanyId,
            };
            console.log("[app_link] using company from frontend headers:", JSON.stringify(primaryCompany));
        } else {
            primaryCompany = pickPrimaryCompany(sessionInfo);
            console.log("[app_link] using company from get_session_info:", JSON.stringify(primaryCompany));
        }

        // ✅ Country override: the visitor's own saved country (from their Odoo
        // partner record) always wins over whatever company_code the frontend
        // sent — that value reflects the backend ERP session's *current company*
        // (almost always MMY), not the customer's registered country.
        const countryShopOrigin = await getUserCountryShopOrigin(request);
        if (countryShopOrigin) {
            try {
                const countrySub = new URL(countryShopOrigin).hostname.split(".")[0].toUpperCase();
                if (primaryCompany) {
                    console.log("[app_link] overriding company_code", primaryCompany.companyCode, "->", countrySub);
                    primaryCompany.companyCode = countrySub;
                } else {
                    primaryCompany = { companyCode: countrySub, companyId: headerCompanyId || "2" };
                }
            } catch (e) {
                console.log("[app_link] country override parse failed:", e?.message || String(e));
            }
        }

        // ✅ append to sso url
        if (primaryCompany) {
            const ssoUrl = new URL(finalUrl);
            ssoUrl.searchParams.set("company_code", primaryCompany.companyCode);
            ssoUrl.searchParams.set("company_id", primaryCompany.companyId);
            finalUrl = ssoUrl.toString();
        }

        upstreamJson.result.url = finalUrl;

        const resHeaders = new Headers({
            "Content-Type": "application/json",
            ...corsHeaders,
        });

        if (sessionId) {
            resHeaders.append(
                "Set-Cookie",
                `session_id=${sessionId}; Path=/; Domain=.snabbb.com; HttpOnly; Secure; SameSite=None; Max-Age=21600`
            );
        }

        return new Response(JSON.stringify(upstreamJson), {
            status: 200,
            headers: resHeaders,
        });
    } catch (err) {
        return new Response(
            JSON.stringify({ ok: false, error: err?.message || "SSO app_link failed" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );
    }
}

 if (url.pathname === "/api/odoo/session_info" && request.method === "GET") {
    try {
        const cookieHeader = request.headers.get("Cookie") || "";

        const sessionRes = await fetch("https://mrbur.odoo.com/web/session/get_session_info", { // ← was my.mrbur.shop
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": cookieHeader,
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {},
                id: 1,
            }),
        });

        const sessionJson = await sessionRes.json().catch(() => null);
        const sessionInfo = sessionJson?.result || null;

        if (!sessionRes.ok || !sessionInfo?.uid) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: "failed_to_get_session_info",
                    details: sessionJson,
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                }
            );
        }

        const uid = sessionInfo.uid;
        const companyCodes = sessionInfo.company_codes || {};

        // 2) Read user default company
        const userRes = await fetch("https://mrbur.odoo.com/web/dataset/call_kw/res.users/read", { 
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Cookie": cookieHeader,
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "call",
                params: {
                    model: "res.users",
                    method: "read",
                    args: [[uid], ["company_id", "company_ids"]],
                    kwargs: {},
                },
                id: 1,
            }),
        });

        const userJson = await userRes.json().catch(() => null);
        const userRow = userJson?.result?.[0] || null;

        if (!userRes.ok || !userRow?.company_id) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: "failed_to_get_default_company",
                    details: userJson,
                }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                }
            );
        }

        const defaultCompanyId = String(userRow.company_id[0]);
        const defaultCompanyName = userRow.company_id[1];
        const defaultCompanyCode = companyCodes[defaultCompanyId] || null;

        return new Response(
            JSON.stringify({
                ok: true,
                uid,
                company_id: defaultCompanyId,
                company_name: defaultCompanyName,
                company_code: defaultCompanyCode,
                company_ids: userRow.company_ids || [],
                company_codes: companyCodes,
            }),
            {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );
    } catch (e) {
        return new Response(
            JSON.stringify({ ok: false, error: e?.message || "default_company_proxy_failed" }),
            {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            }
        );
    }
} 
 

        /* ==============================
            Create user in Odoo
        =================================*/
        // ✅ API: POST /api/v1/users -> forward to Odoo sandbox
        if (url.pathname === "/api/v1/users") {
            if (request.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: corsHeaders });
            }
        
            if (request.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
            }
        
            const upstreamUrl = "https://mrbur.odoo.com/api/v1/users";
        
            const upstreamRes = await fetch(upstreamUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                },
                body: await request.text(),
            });
        
            return new Response(await upstreamRes.text(), {
                status: upstreamRes.status,
                headers: {
                    "Content-Type": upstreamRes.headers.get("Content-Type") || "application/json",
                    ...corsHeaders,
                },
            });
        }

        if (url.pathname === "/api/debug/country") {
    return new Response(JSON.stringify({
        country: request.headers.get("CF-IPCountry"),
        ip: request.headers.get("CF-Connecting-IP"),
    }), {
        headers: { "Content-Type": "application/json", ...corsHeaders }
    });
}

if ((url.hostname === "account.snabbb.com" || url.hostname === "app.snabbb.com") && url.pathname === "/api/account/profile") {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    const jsonResponse = (data, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                ...corsHeaders,
            },
        });
    };

    const cookieHeader = request.headers.get("Cookie") || "";

    // =========================
    // GET profile
    // =========================
    if (request.method === "GET") {
    try {
        const sessionRes = await fetch("https://mrbur.odoo.com/web/session/get_session_info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Cookie: cookieHeader,
            },
            body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: {}, id: 1 }),
        });

        const sessionData = await sessionRes.json().catch(() => null);
        const rawPartnerId = sessionData?.result?.partner_id;
        const partnerId = Array.isArray(rawPartnerId) ? rawPartnerId[0] : rawPartnerId;

        if (!partnerId) {
            return jsonResponse({ ok: false, error: "not_logged_in" }, 401);
        }

        const [partnerRes, categoryRes] = await Promise.all([
            fetch("https://mrbur.odoo.com/web/dataset/call_kw", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json", Cookie: cookieHeader },
                body: JSON.stringify({
                    jsonrpc: "2.0", method: "call", id: 1,
                    params: {
                        model: "res.partner",
                        method: "read",
                        args: [[partnerId]],
                        kwargs: {
                            fields: [
                                "name", "email", "phone", "street", "street2", "city",
                                "zip", "state_id", "country_id", "vat", "x_date_of_birth",
                                "invoice_sending_method", "invoice_edi_format", "company_name", "image_128"
                            ],
                        },
                    },
                }),
            }),
            fetch("https://mrbur.odoo.com/api/snabbb/partner/category", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
                },
                body: JSON.stringify({
                    jsonrpc: "2.0", method: "call", id: 2,
                    params: { partner_id: partnerId },
                }),
            }),
        ]);

        const partnerData = await partnerRes.json().catch(() => null);
        const categoryData = await categoryRes.json().catch(() => null);
        const partner = partnerData?.result?.[0];
        const categoryIds = categoryData?.result?.category_id || [];

        if (!partner) {
            return jsonResponse({ ok: false, error: "partner_not_found" }, 404);
        }

        return jsonResponse({
            ok: true,
            partner_id: partnerId,
            partner: {
                name: partner.name || "",
                email: partner.email || "",
                phone: partner.phone || "",
                street: partner.street || "",
                street2: partner.street2 || "",
                city: partner.city || "",
                zip: partner.zip || "",
                state_id: partner.state_id || false,
                country_id: partner.country_id || false,
                vat: partner.vat || "",
                x_date_of_birth: partner.x_date_of_birth || "",
                category_id: categoryIds,
                invoice_sending_method: partner.invoice_sending_method || "email",
                invoice_edi_format: partner.invoice_edi_format || "",
                company_name: partner.company_name || "",
                has_image: !!partner.image_128,
            },
        });

    } catch (err) {
        return jsonResponse({ ok: false, error: err?.message || "profile_fetch_failed" }, 500);
    }
}

    // =========================
    // POST save profile
    // =========================
    if (request.method === "POST") {
        try {
            const formData = await request.formData();

            const getText = (key) => String(formData.get(key) || "").trim();

            const values = {};

            const setValue = (field, value) => {
                if (value !== undefined && value !== null && String(value).trim() !== "") {
                    values[field] = value;
                }
            };

            setValue("name", getText("name"));
            setValue("email", getText("email"));
            setValue("phone", getText("phone"));
            setValue("street", getText("street"));
            setValue("street2", getText("street2"));
            setValue("city", getText("city"));
            setValue("zip", getText("zipcode"));
            setValue("vat", getText("vat"));
            setValue("x_date_of_birth", getText("x_date_of_birth"));
            setValue("invoice_sending_method", getText("invoice_sending_method"));
            setValue("invoice_edi_format", getText("invoice_edi_format"));

            const stateId = Number(getText("state_id"));
            if (Number.isFinite(stateId) && stateId > 0) {
                values.state_id = stateId;
            }

            const countryId = Number(getText("country_id"));
            if (Number.isFinite(countryId) && countryId > 0) {
                values.country_id = countryId;
            }

            const categoryIds = formData.getAll("category_id")
                .map(Number)
                .filter((n) => Number.isFinite(n) && n > 0);

            if (categoryIds.length > 0) {
                values.category_id = categoryIds;
            }

            const avatarFile = formData.get("profile_picture");

            if (avatarFile && typeof avatarFile === "object" && avatarFile.size > 0) {
                values.image_1920 = await fileToBase64(avatarFile);
            }

            const updateRes = await fetch("https://mrbur.odoo.com/api/snabbb/account/profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Cookie: cookieHeader,
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        values,
                    },
                    id: 1,
                }),
            });

            const updateData = await updateRes.json().catch(() => null);

            if (!updateRes.ok || updateData?.error || updateData?.result?.ok === false) {
                return jsonResponse(
                    {
                        ok: false,
                        error:
                            updateData?.error?.data?.message ||
                            updateData?.error?.message ||
                            updateData?.result?.error ||
                            "profile_update_failed",
                        details: updateData,
                        values,
                    },
                    400
                );
            }

            let profileRewardResult = null;
            try {
                const rewardRes = await fetch("https://mrbur.odoo.com/auth/profile_reward_check", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        Cookie: cookieHeader,
                    },
                    body: JSON.stringify({ jsonrpc: "2.0", method: "call", id: 1, params: {} }),
                });
                const rewardData = await rewardRes.json().catch(() => null);
                profileRewardResult = rewardData?.result || null;
            } catch (e) {
                console.log("[profile-reward] check failed:", e?.message || String(e));
            }

            return jsonResponse({
                ok: true,
                data: updateData,
                values,
                profile_reward: profileRewardResult,
            });
        } catch (err) {
            return jsonResponse(
                {
                    ok: false,
                    error: err?.message || "profile_update_failed",
                },
                500
            );
        }
    }

    return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
    });
}

async function fileToBase64(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }

    return btoa(binary);
}

async function fileToBase64(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }

    return btoa(binary);
}

/* =========================================================
      🎨 USER THEME SYNC
      GET/POST /api/user/theme → proxy to Odoo /api/user/theme
      CORS is already handled globally by the isApi preflight above.
========================================================= */
if (url.pathname === '/api/user/theme') {
    const reqOrigin = request.headers.get('Origin') || '';

    const odooRes = await fetch('https://mrbur.odoo.com/api/user/theme', {
        method: request.method,
        headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('Cookie') || '',
            'Origin': reqOrigin,
        },
        body: request.method === 'POST' ? await request.text() : undefined,
    });

    return new Response(await odooRes.text(), {
        status: odooRes.status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigins.has(reqOrigin) ? reqOrigin : '',
            'Access-Control-Allow-Credentials': 'true',
            'Cache-Control': 'no-store',
            'Vary': 'Origin',
        },
    });
}



/* =========================================================
      🏠 HOME REVERSE PROXY
      app.snabbb.com/home → my.mrbur.shop
========================================================= */

// account.snabbb.com → my.mrbur.shop/my/account
if (url.hostname === "account.snabbb.com" && !isApi) {
    const upstreamUrl = new URL(request.url);
    upstreamUrl.hostname = "my.mrbur.shop";
    upstreamUrl.protocol = "https:";
    // keep the path as-is (root → /my/account)
    if (url.pathname === "/" || url.pathname === "") {
        upstreamUrl.pathname = "/my/account";
    }

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Host", "my.mrbur.shop");

    const upstreamReq = new Request(upstreamUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
        redirect: "manual",
    });

    const upstreamRes = await fetch(upstreamReq);
    const outHeaders = copyResponseHeadersWithoutSetCookie(upstreamRes);
    appendRewrittenCookies(outHeaders, upstreamRes, ".snabbb.com");

    return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: outHeaders,
    });
}

const isMyAccountRequest =
    url.hostname === "app.snabbb.com" &&
    (url.pathname.startsWith("/my/") || url.pathname === "/my" || url.pathname.startsWith("/account/") || url.pathname.startsWith("/sale/") || url.pathname.startsWith("/payment/")) &&
    !url.pathname.startsWith("/my/event");

if (isMyAccountRequest && !isApi) {
    const upstreamUrl = new URL(request.url);
    upstreamUrl.hostname = "my.mrbur.shop";
    upstreamUrl.protocol = "https:";

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Host", "my.mrbur.shop");

    const upstreamReq = new Request(upstreamUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
        redirect: "manual",
    });

    const upstreamRes = await fetch(upstreamReq);
    const outHeaders = copyResponseHeadersWithoutSetCookie(upstreamRes);
    appendRewrittenCookies(outHeaders, upstreamRes, ".snabbb.com");

    return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: outHeaders,
    });
}

const isHomeRequest =
    url.hostname === "app.snabbb.com" &&
    (url.pathname === "/home" || url.pathname.startsWith("/home/"));

if (isHomeRequest && !isApi) {
    const upstreamUrl = new URL(request.url);
    upstreamUrl.hostname = "my.mrbur.shop";
    upstreamUrl.protocol = "https:";
    upstreamUrl.pathname = url.pathname.replace(/^\/home/, "") || "/";

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Host", "my.mrbur.shop");

    const upstreamReq = new Request(upstreamUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
        redirect: "manual",
    });

    const upstreamRes = await fetch(upstreamReq);
    const contentType = upstreamRes.headers.get("content-type") || "";

    const outHeaders = new Headers();
    for (const [key, value] of upstreamRes.headers.entries()) {
        if (key.toLowerCase() === "set-cookie") continue;
        outHeaders.append(key, value);
    }

    if (contentType.includes("text/html")) {
        let html = await upstreamRes.text();

        // Make relative URLs resolve against the upstream site
        if (html.includes("<head>")) {
            html = html.replace(
                "<head>",
                `<head><base href="https://app.snabbb.com/">`
            );
        }

        // Optional but safer: rewrite common root-relative URLs
        html = html
    .replace(/src="\/(?!\/)/g, 'src="https://app.snabbb.com/')
    .replace(/action="\/(?!\/)/g, 'action="https://app.snabbb.com/');

        const script = `
<script>
document.addEventListener('DOMContentLoaded', function() {
    const homeTarget = 'https://app.snabbb.com/home';

    // logo
    const navbarBrand = document.querySelector('a.navbar-brand');
    if (navbarBrand) {
        navbarBrand.setAttribute('href', homeTarget);
        navbarBrand.onclick = function(e) {
            e.preventDefault();
            window.location.href = homeTarget;
        };
    }

    // home menu links
    const allMenuLinks = Array.from(document.querySelectorAll('#top_menu a, a.nav-link, header a'));

    allMenuLinks.forEach(link => {
        const href = (link.getAttribute('href') || '').trim();
        const text = (link.textContent || '').trim().toLowerCase();

        if (href === '/' || href === '/home' || text === 'home') {
            link.setAttribute('href', homeTarget);
            link.onclick = function(e) {
                e.preventDefault();
                window.location.href = homeTarget;
            };
        }
    });
});
</script>`;

        html = html.replace("</body>", script + "</body>");

        return new Response(html, {
            status: upstreamRes.status,
            headers: outHeaders,
        });
    }

    return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: outHeaders,
    });
}

/* =========================================================
      🌐 EVENT REVERSE PROXY
      app.snabbb.com/event → mrbur.odoo.com/event
========================================================= */

const isEventRequest =
    url.hostname === "event.snabbb.com" ||
    (url.hostname === "app.snabbb.com" && (
        url.pathname.startsWith("/event") ||
        url.pathname.startsWith("/my/events") ||
        url.pathname.startsWith("/web/assets") ||
        url.pathname.startsWith("/web/image") ||
        url.pathname.startsWith("/web/content") ||
        url.pathname.startsWith("/website/") ||
        url.pathname.startsWith("/im_livechat") ||
        url.pathname.startsWith("/my/event/notifications") ||
        url.pathname.startsWith("/my/event/applications") ||
        url.pathname.startsWith("/my/home") ||
        url.pathname.startsWith("/my/account")
    ));

if (isEventRequest && !isApi) {

    const upstreamUrl = new URL(request.url);

    upstreamUrl.protocol = "https:";
    upstreamUrl.hostname = ODOO_EVENT_HOST; // mrbur.odoo.com

    const reqHeaders = new Headers(request.headers);

    reqHeaders.set("Host", ODOO_EVENT_HOST);
    reqHeaders.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");
    reqHeaders.set("X-Real-IP", request.headers.get("CF-Connecting-IP") || "");

    const incomingCookie = request.headers.get("Cookie") || "";
    if (incomingCookie) {
        reqHeaders.set("Cookie", incomingCookie);
    }

    const upstreamReq = new Request(upstreamUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
        redirect: "manual",
    });

    const upstreamRes = await fetch(upstreamReq);

    const outHeaders = copyResponseHeadersWithoutSetCookie(upstreamRes);

    appendRewrittenCookies(outHeaders, upstreamRes, ".snabbb.com");

    return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: outHeaders,
    });
}

/* =========================================================
      🌐 SHOP REVERSE PROXY
      Keep browser on fixed shop domain.
      Country-first: uses the logged-in visitor's saved country when
      available; falls back to company_code / cids from the URL (legal
      entity), then to the raw Odoo host as a last resort.
========================================================= */
const isShopRequest =
    (url.hostname === "app.snabbb.com" &&
        (
            url.pathname.startsWith("/shop") ||
            url.pathname.startsWith("/website_sale") ||
            url.pathname.startsWith("/web/") ||
            url.pathname.startsWith("/website/") ||
            url.pathname.startsWith("/products") ||
            url.pathname.startsWith("/product") ||
            url.pathname.startsWith("/home") ||
            url.pathname.startsWith("/payment/") ||
            url.pathname.startsWith("/category_grid/") ||
            url.pathname.startsWith("/banner") ||
            url.pathname.startsWith("/web/image") ||
            url.pathname.startsWith("/web/content") ||
            url.pathname.startsWith("/web/assets") ||
            url.pathname.startsWith("/my/home") ||
            url.pathname.startsWith("/im_livechat") ||
            url.pathname.startsWith("/my/counters") ||
            url.pathname.startsWith("/loyalty") ||
            url.pathname.startsWith("/user_inventory") ||
            url.pathname.startsWith("/sale") ||
            url.pathname.startsWith("/portal") ||
            url.pathname.startsWith("/my") ||
            url.pathname.startsWith("/account") ||
            url.pathname.startsWith("/shop/cart") ||
            url.pathname.startsWith("/contactus") ||
            url.pathname.startsWith("/snabbb_credit") ||
            url.pathname.startsWith("/snabbb")
        )) ||
    (url.hostname === "shop.snabbb.com");
 
if (isShopRequest && !isApi && !url.pathname.startsWith("/sso/")) {
    // ✅ FIX (Indonesia blank shop page): normalize the raw Odoo company_code
    // ("MIN" for Indonesia) to the shop/ISO code ("ID") *before* it's used
    // for any map lookup below. Previously this was just .toUpperCase()'d,
    // so "MIN" never matched "MID"/"ID" in mapCompanyCodeToOrigin() and the
    // fallback silently defaulted to the bare mrbur.odoo.com host instead of
    // id.mrbur.shop whenever the country-first lookup below didn't resolve
    // in time (e.g. session cookie not yet propagated on first launch).
    const companyCode = normalizeShopCompanyCode(url.searchParams.get("company_code") || "");
    const companyId = (url.searchParams.get("cids") || url.searchParams.get("company_id") || "").trim();
 
    function mapCompanyCodeToOrigin(code) {
        const map = {
            MSG: "https://sg.mrbur.shop", SG: "https://sg.mrbur.shop",
            MMY: "https://my.mrbur.shop", MY: "https://my.mrbur.shop",
            MTH: "https://th.mrbur.shop", TH: "https://th.mrbur.shop",
            MID: "https://id.mrbur.shop", ID: "https://id.mrbur.shop",
            MUSA: "https://us.mrbur.shop", US: "https://us.mrbur.shop",
            MUK: "https://uk.mrbur.shop", UK: "https://uk.mrbur.shop",
            MAU: "https://au.mrbur.shop", AU: "https://au.mrbur.shop",
            MVN: "https://vn.mrbur.shop", VN: "https://vn.mrbur.shop",
            MPH: "https://ph.mrbur.shop", PH: "https://ph.mrbur.shop",
            MKR: "https://kr.mrbur.shop", KR: "https://kr.mrbur.shop",
            MCA: "https://ca.mrbur.shop", CA: "https://ca.mrbur.shop",
            MAE: "https://ae.mrbur.shop", AE: "https://ae.mrbur.shop",
            MSA: "https://sa.mrbur.shop", SA: "https://sa.mrbur.shop",
            MNZ: "https://nz.mrbur.shop", NZ: "https://nz.mrbur.shop",
            MEU: "https://eu.mrbur.shop", EU: "https://eu.mrbur.shop",
        };
        return map[code] || `https://${ODOO_SHOP_HOST}`;
    }
 
    // Country-first: the visitor's saved country wins if we can resolve
    // one; otherwise fall back to whatever company_code the SSO link
    // carried (legal entity), then to the raw Odoo host.
    const countryOrigin = await getUserCountryShopOrigin(request);
    const targetOrigin = countryOrigin || mapCompanyCodeToOrigin(companyCode);
 
    const targetUrl = new URL(request.url);
 
    // keep browser domain unchanged, only change upstream target
    targetUrl.protocol = "https:";
    targetUrl.hostname = new URL(targetOrigin).hostname;
 
    // make sure shop root exists
    if ((url.pathname === "/" || url.pathname === "") && url.hostname === "shop.snabbb.com") {
        targetUrl.pathname = "/shop";
    }
 
    // preserve company context upstream
    if (companyId) {
        targetUrl.searchParams.set("cids", companyId);
    }
 
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Host", targetUrl.hostname);
    reqHeaders.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") || "");
    reqHeaders.set("X-Real-IP", request.headers.get("CF-Connecting-IP") || "");
    reqHeaders.delete("Origin");
    reqHeaders.delete("Referer");
 
    const incomingCookie = request.headers.get("Cookie") || "";
    if (incomingCookie) {
        reqHeaders.set("Cookie", incomingCookie);
    } else {
        reqHeaders.delete("Cookie");
    }
 
    const upstreamReq = new Request(targetUrl.toString(), {
        method: request.method,
        headers: reqHeaders,
        body: request.method === "GET" || request.method === "HEAD" ? null : request.body,
        redirect: "manual",
    });
 
    const upstreamRes = await fetch(upstreamReq, {
        cf: {
            cacheTtl: 300,
            cacheEverything: false,
        },
    });
 
    const contentType = upstreamRes.headers.get("Content-Type") || "";
    const outHeaders = copyResponseHeadersWithoutSetCookie(upstreamRes);
 
    const loc = outHeaders.get("Location");
    if (loc) {
        try {
            const locUrl = new URL(loc);
 
            // rewrite upstream redirects back to fixed public shop domain
            if (
                locUrl.hostname.endsWith(".mrbur.shop") ||
                locUrl.hostname === ODOO_SHOP_HOST
            ) {
                locUrl.hostname = "shop.snabbb.com";
                locUrl.protocol = "https:";
 
                if (companyCode && !locUrl.searchParams.get("company_code")) {
                    locUrl.searchParams.set("company_code", companyCode);
                }
                if (companyId && !locUrl.searchParams.get("cids")) {
                    locUrl.searchParams.set("cids", companyId);
                }
 
                outHeaders.set("Location", locUrl.toString());
            } else {
                outHeaders.set("Location", rewriteLocationHeader(loc));
            }
        } catch {
            outHeaders.set("Location", rewriteLocationHeader(loc));
        }
    }
 
    appendRewrittenCookies(outHeaders, upstreamRes, ".snabbb.com");
 
    if (contentType.includes("text/html")) {
        const script = `
<script>
document.addEventListener('DOMContentLoaded', function() {
    const homeTarget = 'https://app.snabbb.com/home';
 
    const logoLink = document.querySelector('#top_menu a[role="menuitem"][href="/home"]');
    if (logoLink) {
        logoLink.setAttribute('href', homeTarget);
        logoLink.onclick = function(e) {
            e.preventDefault();
            window.location.href = homeTarget;
        };
    }
 
    const allMenuLinks = Array.from(document.querySelectorAll('#top_menu a, a.nav-link, header a'));
 
    allMenuLinks.forEach(link => {
        const href = (link.getAttribute('href') || '').trim();
        const text = (link.textContent || '').trim().toLowerCase();
 
        if (href === '/' || href === '/home' || text === 'home') {
            link.setAttribute('href', homeTarget);
            link.onclick = function(e) {
                e.preventDefault();
                window.location.href = homeTarget;
            };
        }
    });
});
</script>`;
 
        const transformedRes = new HTMLRewriter()
            .on('a[href="/my/inventory"]', new RemoveMyInventoryLink())
            .transform(
                new Response(upstreamRes.body, {
                    status: upstreamRes.status,
                    headers: outHeaders,
                })
            );
 
        let html = await transformedRes.text();
        html = html.replace("</body>", script + "</body>");
 
        return new Response(html, {
            status: upstreamRes.status,
            headers: outHeaders,
        });
    }
 
    return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: outHeaders,
    });
}

        /* =========================================================
              🌐 EVENT REVERSE PROXY
              event.snabbb.com → mrbur.odoo.com/event
        ========================================================= */

        const isEventHost = url.hostname === PUBLIC_EVENT_HOST;

        if (isEventHost && !isApi && !url.pathname.startsWith("/sso/")) {
            const upstreamUrl = new URL(request.url);

            upstreamUrl.hostname = ODOO_EVENT_HOST;

            if (upstreamUrl.pathname === "/" || upstreamUrl.pathname === "") {
                upstreamUrl.pathname = ODOO_EVENT_BASE;
            }

            const reqHeaders = new Headers(request.headers);
            reqHeaders.set("Host", ODOO_EVENT_HOST);

            const upstreamReq = new Request(upstreamUrl.toString(), {
                method: request.method,
                headers: reqHeaders,
                body:
                    request.method === "GET" || request.method === "HEAD"
                        ? null
                        : request.body,
                redirect: "manual",
            });

            console.log('upstreamReq: ',upstreamReq.toString())

            const upstreamRes = await fetch(upstreamReq);

            // ✅ Build outHeaders WITHOUT copying Set-Cookie
            const outHeaders = new Headers();
            for (const [key, value] of upstreamRes.headers.entries()) {
                if (key.toLowerCase() === "set-cookie") continue;
                outHeaders.append(key, value);
            }
            
            const loc = outHeaders.get("Location");
            if (loc) outHeaders.set("Location", rewriteLocationHeader(loc));
            
            // ✅ Re-issue all Set-Cookie headers with .snabbb.com domain
            const setCookies = upstreamRes.headers.getSetCookie?.() ?? [];
            for (const cookie of setCookies) {
                if (!cookie.match(/Domain=/i)) {
                    outHeaders.append("Set-Cookie", `${cookie}; Domain=.snabbb.com`);
                } else {
                    outHeaders.append("Set-Cookie", cookie.replace(/Domain=[^;]+/i, "Domain=.snabbb.com"));
                }
            }
            
            return new Response(upstreamRes.body, {
                status: upstreamRes.status,
                headers: outHeaders,
            });
        }

        /* ==============================
        API: /api/appointments
        ============================== */
        if (url.pathname === "/api/appointments") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            /*
            * GET:
            * Calendar and Today tabs.
            */
            if (request.method === "GET") {
            requirePermission(
                access,
                "appointment.schedule.access"
            );

            const data = await getAppointments(
                env,
                clinicId
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            /*
            * POST, PATCH and DELETE all require
            * Manage Appointments.
            */
            requirePermission(
            access,
            "appointment.manage"
            );

            if (request.method === "POST") {
            const body = await request.json();

            /*
            * Ignore any clinic_id supplied by the browser.
            * Force the authenticated shared clinic.
            */
            body.clinic_id = clinicId;

            const data = await createAppointment(
                env,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            if (request.method === "PATCH") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing appointment ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            const body = await request.json();

            /*
            * Do not allow an appointment to be moved
            * to another clinic through the request body.
            */
            delete body.clinic_id;

            const data = await updateAppointment(
                env,
                id,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            if (request.method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing appointment ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            await deleteAppointment(env, id);

            return Response.json(
                { ok: true },
                {
                status: 200,
                headers: corsHeaders,
                }
            );
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST, PATCH, DELETE",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[appointments-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Appointment request failed",
                code:
                error?.code ||
                "appointment_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }

        /* ==============================
        API: /api/patients
        ============================== */
        if (url.pathname === "/api/patients") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            requirePermission(
            access,
            "appointment.patients.access"
            );

            // GET
            if (request.method === "GET") {
            const query =
                url.searchParams.get("query");

            let data;

            if (query) {
                data = await searchPatients(
                env,
                clinicId,
                query
                );
            } else {
                const limit = parseInt(
                url.searchParams.get("limit") ?? "50",
                10
                );

                const offset = parseInt(
                url.searchParams.get("offset") ?? "0",
                10
                );

                data = await getPatients(
                env,
                clinicId,
                limit,
                offset
                );
            }

            return Response.json(data, {
                headers: corsHeaders,
            });
            }

            // POST
            if (request.method === "POST") {
            const body = await request.json();

            body.clinic_id = clinicId;

            const data = await createPatient(
                env,
                body
            );

            return Response.json(data, {
                headers: corsHeaders,
            });
            }

            // PATCH
            if (request.method === "PATCH") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing patient ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            const body = await request.json();

            delete body.clinic_id;

            const data = await updatePatient(
                env,
                id,
                body
            );

            return Response.json(data, {
                headers: corsHeaders,
            });
            }

            // DELETE
            if (request.method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing patient ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            await deletePatient(env, id);

            return Response.json(
                { ok: true },
                {
                headers: corsHeaders,
                }
            );
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST, PATCH, DELETE",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[patients-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Patient request failed",
                code:
                error?.code ||
                "patient_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }

        /* ==============================
        API: /api/staff
        ============================== */
        if (url.pathname === "/api/staff") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            requirePermission(
            access,
            "appointment.settings.manage"
            );

            // GET
            if (request.method === "GET") {
            const data = await getStaff(
                env,
                clinicId
            );

            return Response.json(data, {
                headers: corsHeaders,
            });
            }

            // POST
            if (request.method === "POST") {
            const body = await request.json();

            body.clinic_id = clinicId;

            const data = await createStaff(
                env,
                body
            );

            return Response.json(data, {
                headers: corsHeaders,
            });
            }

            // PATCH
            if (request.method === "PATCH") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing staff ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            const body = await request.json();

            // Prevent changing staff to another clinic.
            delete body.clinic_id;

            const data = await updateStaff(
                env,
                id,
                body
            );

            return Response.json(data, {
                headers: corsHeaders,
            });
            }

            // DELETE
            if (request.method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing staff ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            await deleteStaff(env, id);

            return Response.json(
                { ok: true },
                {
                headers: corsHeaders,
                }
            );
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST, PATCH, DELETE",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[staff-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Staff request failed",
                code:
                error?.code ||
                "staff_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }

        /* ==============================
        API: /api/rooms
        ============================== */
        if (url.pathname === "/api/rooms") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            requirePermission(
            access,
            "appointment.settings.manage"
            );

            // GET
            if (request.method === "GET") {
            const data = await getRooms(
                env,
                clinicId
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // POST
            if (request.method === "POST") {
            const body = await request.json();

            // Always use the authenticated workspace clinic.
            body.clinic_id = clinicId;

            const data = await createRoom(
                env,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // PATCH
            if (request.method === "PATCH") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing room ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            const body = await request.json();

            // Prevent moving the room to another clinic.
            delete body.clinic_id;

            const data = await updateRoom(
                env,
                id,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // DELETE
            if (request.method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing room ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            await deleteRoom(env, id);

            return Response.json(
                { ok: true },
                {
                status: 200,
                headers: corsHeaders,
                }
            );
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST, PATCH, DELETE",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[rooms-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Room request failed",
                code:
                error?.code ||
                "room_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }

        /* ==============================
        API: /api/treatments
        ============================== */
        if (url.pathname === "/api/treatments") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            requirePermission(
            access,
            "appointment.settings.manage"
            );

            // GET
            if (request.method === "GET") {
            const data = await getTreatments(
                env,
                clinicId
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // POST
            if (request.method === "POST") {
            const body = await request.json();

            body.clinic_id = clinicId;

            const data = await createTreatment(
                env,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // PATCH
            if (request.method === "PATCH") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing treatment ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            const body = await request.json();

            delete body.clinic_id;

            const data = await updateTreatment(
                env,
                id,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // DELETE
            if (request.method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing treatment ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            await deleteTreatment(env, id);

            return Response.json(
                { ok: true },
                {
                status: 200,
                headers: corsHeaders,
                }
            );
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST, PATCH, DELETE",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[treatments-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Treatment request failed",
                code:
                error?.code ||
                "treatment_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }

        /* ==============================
        API: /api/settings
        ============================== */
        if (url.pathname === "/api/settings") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            requirePermission(
            access,
            "appointment.settings.manage"
            );

            // GET
            if (request.method === "GET") {
            const data = await getSettings(
                env,
                clinicId
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // POST: save/upsert settings
            if (request.method === "POST") {
            const body = await request.json();

            /*
            * Force settings to be saved to the
            * authenticated workspace clinic.
            */
            body.clinic_id = clinicId;

            const data = await saveSettings(
                env,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[settings-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Settings request failed",
                code:
                error?.code ||
                "settings_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }
        /* ==============================
        API: /api/holidays
        ============================== */
        if (url.pathname === "/api/holidays") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            requirePermission(
            access,
            "appointment.settings.manage"
            );

            // GET
            if (request.method === "GET") {
            const data = await getHolidays(
                env,
                clinicId
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // POST
            if (request.method === "POST") {
            const body = await request.json();

            body.clinic_id = clinicId;

            const data = await addHoliday(
                env,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // PATCH
            if (request.method === "PATCH") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing holiday ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            const body = await request.json();

            delete body.clinic_id;

            const data = await updateHoliday(
                env,
                id,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            // DELETE
            if (request.method === "DELETE") {
            const id = url.searchParams.get("id");

            if (!id) {
                return Response.json(
                {
                    ok: false,
                    error: "Missing holiday ID",
                },
                {
                    status: 400,
                    headers: corsHeaders,
                }
                );
            }

            await deleteHoliday(env, id);

            return Response.json(
                { ok: true },
                {
                status: 200,
                headers: corsHeaders,
                }
            );
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST, PATCH, DELETE",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[holidays-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Holiday request failed",
                code:
                error?.code ||
                "holiday_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }
        /* ==============================
        API: /api/activity
        ============================== */
        if (url.pathname === "/api/activity") {
        try {
            const {
            access,
            clinicId,
            } = await resolveAppointmentAccess(
            request,
            env
            );

            /*
            * Viewing Activity requires report permission.
            */
            if (request.method === "GET") {
            requirePermission(
                access,
                "appointment.reports.view"
            );

            const data = await getActivity(
                env,
                clinicId
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            /*
            * Do not require report-viewing permission
            * when the app writes an activity log.
            */
            if (request.method === "POST") {
            const body = await request.json();

            body.clinic_id = clinicId;

            const data = await addActivity(
                env,
                body
            );

            return Response.json(data, {
                status: 200,
                headers: corsHeaders,
            });
            }

            return Response.json(
            {
                ok: false,
                error: "Method Not Allowed",
            },
            {
                status: 405,
                headers: {
                Allow: "GET, POST",
                ...corsHeaders,
                },
            }
            );
        } catch (error) {
            console.error(
            "[activity-api]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Activity request failed",
                code:
                error?.code ||
                "activity_request_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }

       /* ==============================
    API: /api/requests
    ============================== */
    if (url.pathname === "/api/requests") {
    try {
        const {
        access,
        clinicId,
        } = await resolveAppointmentAccess(
        request,
        env
        );

        requirePermission(
        access,
        "appointment.requests.manage"
        );

        // GET
        if (request.method === "GET") {
        const data = await getRequests(
            env,
            clinicId
        );

        return Response.json(data, {
            status: 200,
            headers: corsHeaders,
        });
        }

        // PATCH
        if (request.method === "PATCH") {
        const id = url.searchParams.get("id");

        if (!id) {
            return Response.json(
            {
                ok: false,
                error: "Missing request ID",
            },
            {
                status: 400,
                headers: corsHeaders,
            }
            );
        }

        const body = await request.json();

        // Do not allow changing the request's clinic.
        delete body.clinic_id;

        const data = await updateRequest(
            env,
            id,
            body
        );

        return Response.json(data, {
            status: 200,
            headers: corsHeaders,
        });
        }

        return Response.json(
        {
            ok: false,
            error: "Method Not Allowed",
        },
        {
            status: 405,
            headers: {
            Allow: "GET, PATCH",
            ...corsHeaders,
            },
        }
        );
    } catch (error) {
        console.error(
        "[requests-api]",
        error
        );

        return Response.json(
        {
            ok: false,
            error:
            error?.message ||
            "Booking request failed",
            code:
            error?.code ||
            "booking_request_failed",
        },
        {
            status: error?.status || 500,
            headers: corsHeaders,
        }
        );
    }
    }

            /* ==============================
              API: /api/clinics
              ============================== */
            if (url.pathname === "/api/clinics") {
                const auth = request.headers.get("Authorization");
                if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
                const token = auth.slice(7);
                try {
                    const p = parseJwtPayload(token);
                    if (p?.exp && p.exp * 1000 < Date.now()) throw new Error("expired");
                } catch { return new Response("Invalid Token", { status: 401, headers: corsHeaders }); }

                try {
                    if (request.method === "GET") {
                            const id = url.searchParams.get("id");
                            if (id) {
                                    const data = await getClinicById(env, id);
                                    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                            }
                            const data = await getClinics(env);
                            return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                    }
                    if (request.method === "POST") {
                            const data = await addClinic(env, await request.json());
                            return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                    }
                    if (request.method === "PATCH") {
                            const id = url.searchParams.get("id");
                            const data = await updateClinic(env, id, await request.json());
                            return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                    }
                    if (request.method === "DELETE") {
                            const id = url.searchParams.get("id");
                            await deleteClinic(env, id);
                            return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                    }
                } catch (e) {
                    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
                }
            }

            /* ==============================
              API: /api/apt_profiles
              ============================== */
        if (url.pathname === "/api/profiles") {
            const auth = request.headers.get("Authorization");
            if (!auth?.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
            const token = auth.slice(7);
            try {
                  const p = parseJwtPayload(token);
                  if (p?.exp && p.exp * 1000 < Date.now()) throw new Error("expired");
            } catch { return new Response("Invalid Token", { status: 401, headers: corsHeaders }); }

            try {
                if (request.method === "GET") {
                        const id = url.searchParams.get("id");
                        const email = url.searchParams.get("email");

                        if (id) {
                              const data = await getProfileById(env, id);
                              return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                        }
                        if (email) {
                              const data = await getProfileByEmail(env, email);
                              return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                        }

                        // Default: List all
                        const data = await getProfiles(env);
                        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                }

                if (request.method === "PATCH") {
                        const id = url.searchParams.get("id");
                        if (!id) throw new Error("Missing ID");
                        const data = await updateProfile(env, id, await request.json());
                        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json", ...corsHeaders } });
                }
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
            }
        }

        /* ==============================
        API: POST /api/inventory/sync
        ============================== */
        if (
        url.pathname ===
            "/api/inventory/sync"
        ) {
        try {
            if (request.method !== "POST") {
            return Response.json(
                {
                ok: false,
                error: "Method Not Allowed",
                },
                {
                status: 405,
                headers: {
                    Allow: "POST",
                    ...corsHeaders,
                },
                }
            );
            }

            const {
            access,
            workspaceUserId,
            } = await resolveInventoryAccess(
            request,
            env
            );

            /*
            * IMPORTANT:
            * Full sync can replace clinic layout, items
            * and stock simultaneously. Until it is split
            * into smaller endpoints, require all three.
            */
            requirePermission(
            access,
            "inventory.clinic.manage"
            );

            requirePermission(
            access,
            "inventory.items.manage"
            );

            requirePermission(
            access,
            "inventory.stock.manage"
            );

            const body = await request.json();

            /*
            * Never trust body.user_id.
            */
            body.user_id = workspaceUserId;

            await inventoryFullSync(
            env,
            body
            );

            return Response.json(
            { ok: true },
            {
                status: 200,
                headers: corsHeaders,
            }
            );
        } catch (error) {
            console.error(
            "[inventory-sync]",
            error
            );

            return Response.json(
            {
                ok: false,
                error:
                error?.message ||
                "Unable to synchronize Inventory",
                code:
                error?.code ||
                "inventory_sync_failed",
            },
            {
                status: error?.status || 500,
                headers: corsHeaders,
            }
            );
        }
        }

        /* ==============================
              API: POST /api/inventory/profiles
              ============================== */
        if (url.pathname === "/api/inventory/profile/latest" && request.method === "GET") {
            const userId = url.searchParams.get("userId");
            if (!userId) {
                return new Response(JSON.stringify({ error: "Missing userId" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        
            try {
                const profile = await getLatestProfileByUserId(env, userId);
                return new Response(JSON.stringify({ data: profile, error: null }), {
                    status: 200,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } catch (e) {
                return new Response(JSON.stringify({ data: null, error: e.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }

        /* ==============================
              API: GET /api/bootstrap
              ============================== */
        if (url.pathname === "/api/bootstrap") {
            // ✅ Cookie-based auth
            const token = getTokenFromRequest(request);
            if (!token) {
                return new Response(JSON.stringify({ loggedIn: false }), {
                    status: 401,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const decoded = decodeAndValidateToken(token);
            if (!decoded.ok) {
                return new Response(JSON.stringify({ loggedIn: false, error: decoded.error }), {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json",
                        ...(decoded.error === "expired" ? { "Set-Cookie": buildClearCookie() } : {}),
                        ...corsHeaders,
                    },
                });
            }

            try {
                const result = await supabaseBootstrapByEmail(env, decoded.email);

                return new Response(
                    JSON.stringify({
                        loggedIn: true,
                        user: result,
                    }),
                    { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
                );
            } catch (e) {
                return new Response(JSON.stringify({ loggedIn: false, error: e.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
        }

        /* ==============================
            API: GET /api/verify-token
            (kept same shape, but reads cookie)
        ============================== */
        if (url.pathname === "/api/verify-token") {
            const token = getTokenFromRequest(request);
            if (!token) {
                return new Response(JSON.stringify({ loggedIn: false }), {
                    status: 401,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const decoded = decodeAndValidateToken(token);
            if (!decoded.ok) {
                return new Response(JSON.stringify({ loggedIn: false }), {
                    status: 401,
                    headers: {
                        "Content-Type": "application/json",
                        ...(decoded.error === "expired" ? { "Set-Cookie": buildClearCookie() } : {}),
                        ...corsHeaders,
                    },
                });
            }

            // fetch profile
            let profile;
            try {
                profile = await getProfileByEmail(env, decoded.email);
            } catch (e) {
                return new Response(JSON.stringify({ loggedIn: false, error: e.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            if (!profile) {
                return new Response(JSON.stringify({ loggedIn: false }), {
                    status: 403,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            // fetch meta
            let meta = [];
            const workspace = await resolveWorkspaceContext(env, profile);
            try {
                meta = await getInventoryMetaByUserId(env,  workspace.workspaceUserId);
            } catch {
                meta = [];
            }

            return new Response(
                JSON.stringify({
                    loggedIn: true,
                    user: {
                        profiles: {
                            user: {
                                user_id: profile.user_id,
                                email: profile.email,
                                user_metadata: {
                                    name: profile.name,
                                    account_type: profile.account_type,
                                    phone: profile.phone,
                                    position: profile.position,
                                    company_name: profile.company_name,
                                },
                            },
                        },
                        meta,
                        rooms: [],
                        rooms_error: null,
                        items_data: [],
                        history_data: [],
                        log_data: [],
                    },
                }),
                { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
        }

        /* ==============================
              API: GET /api/collaborators
              ============================== */
            if (url.pathname === "/api/collaborators" && request.method === "GET") {
                const uid = url.searchParams.get("uid");
                if (!uid) {
                    return new Response(JSON.stringify({ error: "Missing uid" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    });
                }
            
                try {
                    const shared = await getCollaboratorsByUserId(env, uid);
                    return new Response(JSON.stringify({ data: shared, error: null }), {
                        status: 200,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    });
                } catch (e) {
                    return new Response(JSON.stringify({ data: null, error: e.message }), {
                        status: 500,
                        headers: { "Content-Type": "application/json", ...corsHeaders },
                    });
                }
            }

            /* ==============================
            API: GET /api/inventory/meta
            ============================== */
            if (
            url.pathname === "/api/inventory/meta"
            ) {
            try {
                if (request.method !== "GET") {
                return Response.json(
                    {
                    ok: false,
                    error: "Method Not Allowed",
                    },
                    {
                    status: 405,
                    headers: {
                        Allow: "GET",
                        ...corsHeaders,
                    },
                    }
                );
                }

                const {
                access,
                workspaceUserId,
                } = await resolveInventoryAccess(
                request,
                env
                );

                requirePermission(
                access,
                "inventory.access"
                );

                const meta =
                await getInventoryMetaByUserId(
                    env,
                    workspaceUserId
                );

                return Response.json(meta, {
                status: 200,
                headers: corsHeaders,
                });
            } catch (error) {
                console.error(
                "[inventory-meta]",
                error
                );

                return Response.json(
                {
                    ok: false,
                    error:
                    error?.message ||
                    "Unable to load inventory",
                    code:
                    error?.code ||
                    "inventory_meta_failed",
                },
                {
                    status: error?.status || 500,
                    headers: corsHeaders,
                }
                );
            }
            }

           /* ==============================
            API: PATCH /api/inventory/rooms/position
            ============================== */
            if (
            url.pathname ===
                "/api/inventory/rooms/position"
            ) {
            try {
                if (request.method !== "PATCH") {
                return Response.json(
                    {
                    ok: false,
                    error: "Method Not Allowed",
                    },
                    {
                    status: 405,
                    headers: {
                        Allow: "PATCH",
                        ...corsHeaders,
                    },
                    }
                );
                }

                const {
                access,
                workspaceUserId,
                } = await resolveInventoryAccess(
                request,
                env
                );

                requirePermission(
                access,
                "inventory.clinic.manage"
                );

                let body;

                try {
                body = await request.json();
                } catch {
                return Response.json(
                    {
                    ok: false,
                    error: "Invalid JSON body",
                    },
                    {
                    status: 400,
                    headers: corsHeaders,
                    }
                );
                }

                const {
                id,
                x,
                y,
                } = body || {};

                if (!id) {
                return Response.json(
                    {
                    ok: false,
                    error: "Missing room ID",
                    },
                    {
                    status: 400,
                    headers: corsHeaders,
                    }
                );
                }

                if (
                !Number.isFinite(x) ||
                !Number.isFinite(y)
                ) {
                return Response.json(
                    {
                    ok: false,
                    error:
                        "Room position must contain valid x and y values",
                    },
                    {
                    status: 400,
                    headers: corsHeaders,
                    }
                );
                }

                await updateRoomPosition(
                env,
                id,
                x,
                y,
                workspaceUserId
                );

                return Response.json(
                {
                    ok: true,
                    id,
                    pos_x: x,
                    pos_y: y,
                },
                {
                    status: 200,
                    headers: corsHeaders,
                }
                );
            } catch (error) {
                console.error(
                "[inventory-room-position]",
                error
                );

                return Response.json(
                {
                    ok: false,
                    error:
                    error?.message ||
                    "Unable to update room position",
                    code:
                    error?.code ||
                    "room_position_failed",
                },
                {
                    status: error?.status || 500,
                    headers: corsHeaders,
                }
                );
            }
            }

              
          /* ==============================
            API: GET /api/inventory/rooms
            ============================== */
            if (
            url.pathname ===
                "/api/inventory/rooms"
            ) {
            try {
                if (request.method !== "GET") {
                return Response.json(
                    {
                    ok: false,
                    error: "Method Not Allowed",
                    },
                    {
                    status: 405,
                    headers: {
                        Allow: "GET",
                        ...corsHeaders,
                    },
                    }
                );
                }

                const {
                access,
                workspace,
                workspaceUserId,
                } = await resolveInventoryAccess(
                request,
                env
                );

                requirePermission(
                access,
                "inventory.access"
                );

                const rooms =
                await getRoomsWithItemsByUserId(
                    env,
                    workspaceUserId
                );

                return Response.json(
                {
                    data: rooms,
                    workspace: {
                    actorType:
                        workspace.actorType,
                    role: access.role,
                    workspaceUserId,
                    },
                },
                {
                    status: 200,
                    headers: corsHeaders,
                }
                );
            } catch (error) {
                console.error(
                "[inventory-rooms]",
                error
                );

                return Response.json(
                {
                    data: null,
                    error:
                    error?.message ||
                    "Unable to load inventory rooms",
                    code:
                    error?.code ||
                    "inventory_rooms_failed",
                },
                {
                    status: error?.status || 500,
                    headers: corsHeaders,
                }
                );
            }
            }
        /* ====================================
            API: GET country_codes
            ====================================*/
            if (url.pathname === "/api/location") {
                const ip = request.headers.get("CF-Connecting-IP");
                const country = request.headers.get("CF-IPCountry");

                return new Response(
                    JSON.stringify({
                        ip,
                        country_code: country
                    }),
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*"
                        }
                    }
                );
            }
        

        /* ==============================
            ✅ API: GET /api/token
            Server-to-server only.
            Odoo calls this with ?sid=<session_id>
            Returns a signed JWT as JSON (no cookies)
        ============================== */
        if (url.pathname === "/api/token" && request.method === "GET") {
            const sid = url.searchParams.get("sid");
        
            if (!sid) {
                return new Response(JSON.stringify({ ok: false, error: "Missing sid" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }
        
            // Validate the Odoo session
            let sessionInfo;
            try {
                const odooRes = await fetch("https://app.snabbb.com/api/web/session/get_session_info", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        Cookie: `session_id=${sid}`,
                    },
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        method: "call",
                        params: {},
                        id: 1,
                    }),
                });
            
                const odooData = await odooRes.json().catch(() => null);
            
                // Odoo returns uid: false if the session is invalid/expired
                if (!odooData?.result?.uid) {
                    return new Response(JSON.stringify({ ok: false, error: "Invalid or expired Odoo session" }), {
                        status: 401,
                        headers: { "Content-Type": "application/json" },
                    });
                }
            
                sessionInfo = odooData.result;
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: `Odoo validation failed: ${e.message}` }), {
                    status: 502,
                    headers: { "Content-Type": "application/json" },
                });
            }
        
            // Sign the JWT
            const now = Math.floor(Date.now() / 1000);
            let token;
            try {
                token = await signHS256({
                    header: { alg: "HS256", typ: "JWT" },
                    payload: {
                        iss: "mrbur-worker",
                        aud: "gallery",
                        sub: String(sessionInfo.uid),
                        email: sessionInfo.username ?? "",
                        name: sessionInfo.name ?? "",
                        odoo_sid: sid,
                        iat: now,
                        exp: now + DEFAULT_MAX_AGE,
                    },
                    secret: env.APP_JWT_SECRET ?? env.SUPABASE_JWT_SECRET,
                });
            } catch (e) {
                return new Response(JSON.stringify({ ok: false, error: `JWT signing failed: ${e.message}` }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }
        
            return new Response(JSON.stringify({ ok: true, token }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        /* ==============================
              ✅ API: GET /api/redirect
              Now supports ?company= param to route
              user to the right regional shop.
        ============================== */
        if (url.pathname === "/api/redirect" && request.method === "GET") {
            const sid = url.searchParams.get("sid");
            const next = url.searchParams.get("next");
            const company = url.searchParams.get("company"); // ← NEW: e.g. "MY", "SG"
        
            if (!sid) {
                return new Response("Missing sid", { status: 400 });
            }
        
            // Resolve destination: explicit `next` > company-mapped shop > default
            let destination;
            if (next) {
                destination = next;
            } else if (company) {
                destination = mapCompanyCodeToShopOrigin(company); // uses your existing map
            } else {
                destination = "https://app.snabbb.com";
            }
        
            const outHeaders = new Headers({
                "Location": destination,
                "Cache-Control": "no-store",
                ...corsHeaders,
            });
        
            outHeaders.append("Set-Cookie", buildSharedOdooSessionCookie(sid));
        
            return new Response(null, {
                status: 302,
                headers: outHeaders,
            });
        }

        // ✅ FIX (Indonesia blank shop page): normalize the raw Odoo
        // company_code ("MIN" for Indonesia) before this map is consulted,
        // same as the isShopRequest block above. Previously "MIN" was never
        // matched here either, so /api/redirect?company=MIN silently fell
        // through to the generic "https://shop.snabbb.com" default.
        function mapCompanyCodeToShopOrigin(companyCode) {
    const code = normalizeShopCompanyCode(companyCode);

    const companyRedirects = {
        MSG: "https://sg.mrbur.shop",
        SG: "https://sg.mrbur.shop",

        MMY: "https://my.mrbur.shop",
        MY: "https://my.mrbur.shop",

        MTH: "https://th.mrbur.shop",
        TH: "https://th.mrbur.shop",

        MID: "https://id.mrbur.shop",
        ID: "https://id.mrbur.shop",

        MUSA: "https://us.mrbur.shop",
        US: "https://us.mrbur.shop",

        MUK: "https://uk.mrbur.shop",
        UK: "https://uk.mrbur.shop",

        MAU: "https://au.mrbur.shop",
        AU: "https://au.mrbur.shop",

        MVN: "https://vn.mrbur.shop",
        VN: "https://vn.mrbur.shop",

        MPH: "https://ph.mrbur.shop",
        PH: "https://ph.mrbur.shop",

        MKR: "https://kr.mrbur.shop",
        KR: "https://kr.mrbur.shop",

        MCA: "https://ca.mrbur.shop",
        CA: "https://ca.mrbur.shop",

        MAE: "https://ae.mrbur.shop",
        AE: "https://ae.mrbur.shop",

        MSA: "https://sa.mrbur.shop",
        SA: "https://sa.mrbur.shop",

        MNZ: "https://nz.mrbur.shop",
        NZ: "https://nz.mrbur.shop",

        MEU: "https://eu.mrbur.shop",
        EU: "https://eu.mrbur.shop",
    };

    return companyRedirects[code] || "https://shop.snabbb.com";
}

    /* ==============================
      ✅ SSO LOGIN (UPDATED: SET COOKIE + REDIRECT)
================================= */
if (url.pathname === "/sso/login") {
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 400 });

    const decoded = decodeAndValidateToken(token);
    if (!decoded.ok) {
        return new Response("Invalid Token", { status: 400 });
    }

    const appCode = decoded.payload.aud;
    const config = APP_CONFIG[appCode];
    if (!config) {
        return new Response(`Unknown App Code: ${appCode}`, { status: 400 });
    }

    const maxAge = DEFAULT_MAX_AGE;

    // ✅ NEW: read company from URL
    const companyCode = (url.searchParams.get("company_code") || "").trim().toUpperCase();
    const companyId = (url.searchParams.get("company_id") || "").trim();

    // ✅ FIX (Indonesia blank shop page): same normalization as the other
    // two mapCompanyCodeToShopOrigin copies in this file — "MIN" (Odoo's
    // real company code for Indonesia) now resolves to "ID" before the
    // lookup instead of falling through silently.
    function mapCompanyCodeToShopOrigin(companyCode) {
        const map = {
            MSG: "https://sg.mrbur.shop",
            SG: "https://sg.mrbur.shop",

            MMY: "https://my.mrbur.shop",
            MY: "https://my.mrbur.shop",

            MTH: "https://th.mrbur.shop",
            TH: "https://th.mrbur.shop",

            MID: "https://id.mrbur.shop",
            ID: "https://id.mrbur.shop",

            MUSA: "https://us.mrbur.shop",
            US: "https://us.mrbur.shop",

            MUK: "https://uk.mrbur.shop",
            UK: "https://uk.mrbur.shop",

            MAU: "https://au.mrbur.shop",
            AU: "https://au.mrbur.shop",

            MVN: "https://vn.mrbur.shop",
            VN: "https://vn.mrbur.shop",

            MPH: "https://ph.mrbur.shop",
            PH: "https://ph.mrbur.shop",

            MKR: "https://kr.mrbur.shop",
            KR: "https://kr.mrbur.shop",

            MCA: "https://ca.mrbur.shop",
            CA: "https://ca.mrbur.shop",

            MAE: "https://ae.mrbur.shop",
            AE: "https://ae.mrbur.shop",

            MSA: "https://sa.mrbur.shop",
            SA: "https://sa.mrbur.shop",

            MNZ: "https://nz.mrbur.shop",
            NZ: "https://nz.mrbur.shop",

            MEU: "https://eu.mrbur.shop",
            EU: "https://eu.mrbur.shop",
        };

        return map[normalizeShopCompanyCode(companyCode)] || null;
    }

    // ===============================
    // 🚀 SHOP ROUTING (MAIN FIX)
    // ===============================
    if (appCode === "shop") {
    const targetUrl = new URL("https://shop.snabbb.com/shop");

    if (companyCode) {
        targetUrl.searchParams.set("company_code", companyCode);
    }

    if (companyId) {
        targetUrl.searchParams.set("cids", companyId);
    }

    return new Response(null, {
        status: 302,
        headers: {
            "Set-Cookie": buildSetCookie({
                value: token,
                domain: ".snabbb.com",
                maxAge,
            }),
            Location: targetUrl.toString(),
            "Cache-Control": "no-store",
        },
    });
}

    // ===============================
    // 🟣 SUPABASE APP
    // ===============================
    if (config.type === "supabase") {
        try {
            await getProfileByEmail(env, decoded.email);
        } catch (e) {
            return new Response(e.message, { status: 500 });
        }

        // Carry this launch's token to the destination app so its exchange cannot
        // accidentally consume a shared cookie overwritten by another app/tab.
        const targetUrl = new URL(config.baseUrl);
        targetUrl.searchParams.set("sso_token", token);

        return new Response(null, {
            status: 302,
            headers: {
                "Set-Cookie": buildSetCookie({
                    value: token,
                    domain: ".snabbb.com",
                    maxAge,
                }),
                Location: targetUrl.toString(),
                "Cache-Control": "no-store",
            },
        });
    }

    // ===============================
    // 🟠 ODOO APP (NON-SHOP)
    // ===============================
    if (config.type === "odoo") {
        try {
            await getProfileByEmail(env, decoded.email);
        } catch (e) {
            return new Response(e.message, { status: 500 });
        }

        return new Response(null, {
            status: 302,
            headers: {
                "Set-Cookie": buildSetCookie({
                    value: token,
                    domain: ".snabbb.com",
                    maxAge,
                }),
                Location: config.baseUrl,
                "Cache-Control": "no-store",
            },
        });
    }
}

        /**
          * Headless Odoo session auth (server-side only)
          * - POST /api/odoo/login    { email, password } -> stores session_id in KV, returns app JWT
          * - GET    /api/odoo/me          -> returns cached sessionInfo (requires Bearer token)
          * - POST /api/odoo/rpc        -> proxies /web/dataset/call_kw using stored session_id (requires Bearer token)
          * - POST /api/odoo/logout -> deletes KV session (requires Bearer token)
          */
            
        // POST /api/odoo/login
        if (url.pathname === "/api/odoo/login") {
            if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
            if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        
            let body;
            try {
                body = await request.json();
            } catch {
                return json({ ok: false, error: "Invalid JSON" }, 400);
            }
        
            const email = (body?.email || "").trim();
            const password = body?.password;
        
            if (!email || !password) return json({ ok: false, error: "Missing email or password" }, 400);
            if (!env.ODOO_BASE || !env.ODOO_DB) return json({ ok: false, error: "Missing ODOO_BASE or ODOO_DB" }, 500);
            if (!env.APP_JWT_SECRET) return json({ ok: false, error: "Missing APP_JWT_SECRET" }, 500);
            if (!env.ODOO_SESSIONS) return json({ ok: false, error: "Missing KV binding ODOO_SESSIONS" }, 500);
        
            const rpcBody = {
                jsonrpc: "2.0",
                method: "call",
                params: { db: env.ODOO_DB, login: email, password },
                id: body?.id ?? 1,
            };
        
            const { res, data, setCookie } = await odooJsonRpc({
                base: env.ODOO_BASE,
                path: "/web/session/authenticate",
                body: rpcBody,
            });
        
            if (!res.ok) return json({ ok: false, error: "Upstream Odoo error", status: res.status, data }, 502);
            if (data?.error) return json({ ok: false, error: data?.error?.message || "Odoo login failed", data }, 401);
        
            const result = data?.result || {};
            const uid = result?.uid;
            if (!uid) return json({ ok: false, error: "No uid returned from Odoo", data }, 502);
        
            const sessionCookie = parseCookie(setCookie); // expects "session_id=...."
            if (!sessionCookie) return json({ ok: false, error: "Missing session_id from Odoo Set-Cookie" }, 502);
        
            const sessionInfo = {
                uid,
                name: result?.name ?? result?.partner_display_name ?? "",
                email: result?.username ?? email,
                partner_id: result?.partner_id ?? null,
                db: result?.db ?? env.ODOO_DB,
            };
        
            // Cache session_id server-side (6h example TTL)
            await env.ODOO_SESSIONS.put(
                kvKeyForOdoo(String(uid)),
                JSON.stringify({ cookie: sessionCookie, sessionInfo, updated_at: Date.now() }),
                { expirationTtl: 60 * 60 * 6 }
            );
        
            // Issue app JWT (HS256) using your existing signHS256()
            const now = Math.floor(Date.now() / 1000);
            const appToken = await signHS256({
                header: { alg: "HS256", typ: "JWT" },
                payload: {
                    iss: "mrbur-worker",
                    aud: "react",
                    sub: String(uid),
                    email: sessionInfo.email,
                    name: sessionInfo.name,
                    iat: now,
                    exp: now + 60 * 60,
                },
                secret: env.APP_JWT_SECRET,
            });
        
            return json({ ok: true, token: appToken, sessionInfo }, 200);
        }
        
        // GET /api/odoo/me
        if (url.pathname === "/api/odoo/me") {
            if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
            if (request.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        
            const token = getBearer(request);
            if (!token) return json({ ok: false, error: "Missing Authorization Bearer token" }, 401);
        
            const v = await verifyHS256({ token, secret: env.APP_JWT_SECRET });
            if (!v.ok) return json({ ok: false, error: v.error || "Invalid token" }, 401);
        
            const uid = v.payload.sub;
            const stored = await env.ODOO_SESSIONS.get(kvKeyForOdoo(String(uid)));
            if (!stored) return json({ ok: false, error: "No cached Odoo session" }, 401);
        
            const parsed = JSON.parse(stored);
            return json({ ok: true, sessionInfo: parsed.sessionInfo }, 200);
        }
        
        // POST /api/odoo/rpc
        if (url.pathname === "/api/odoo/rpc") {
            if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
            if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        
            const token = getBearer(request);
            if (!token) return json({ ok: false, error: "Missing Authorization Bearer token" }, 401);
        
            const v = await verifyHS256({ token, secret: env.APP_JWT_SECRET });
            if (!v.ok) return json({ ok: false, error: v.error || "Invalid token" }, 401);
        
            const uid = v.payload.sub;
            const stored = await env.ODOO_SESSIONS.get(kvKeyForOdoo(String(uid)));
            if (!stored) return json({ ok: false, error: "No cached Odoo session" }, 401);
        
            const parsed = JSON.parse(stored);
            const cookie = parsed?.cookie; // "session_id=...."
            if (!cookie) return json({ ok: false, error: "Cached session missing cookie" }, 401);
        
            let body;
            try {
                body = await request.json();
            } catch {
                return json({ ok: false, error: "Invalid JSON" }, 400);
            }
        
            const model = body?.model;
            const method = body?.method;
            const args = body?.args ?? [];
            const kwargs = body?.kwargs ?? {};
        
            if (!model || !method) return json({ ok: false, error: "Missing model or method" }, 400);
        
            const rpcBody = {
                jsonrpc: "2.0",
                method: "call",
                params: { model, method, args, kwargs },
                id: body?.id ?? 1,
            };
        
            const { res, data, setCookie } = await odooJsonRpc({
                base: "https://mrbur.odoo.com",
                path: "/web/dataset/call_kw",
                body: rpcBody,
                cookie,
            });
        
            // If Odoo rotates session cookie, update KV
            const newCookie = parseCookie(setCookie);
            if (newCookie && newCookie !== cookie) {
                parsed.cookie = newCookie;
                parsed.updated_at = Date.now();
                await env.ODOO_SESSIONS.put(kvKeyForOdoo(String(uid)), JSON.stringify(parsed), {
                    expirationTtl: 60 * 60 * 6,
                });
            }
        
            if (!res.ok) return json({ ok: false, error: "Upstream Odoo error", status: res.status, data }, 502);
            if (data?.error) return json({ ok: false, error: data?.error?.message || "Odoo RPC error", data }, 400);
        
            return json({ ok: true, result: data?.result }, 200);
        }
        
        // POST /api/odoo/logout
        if (url.pathname === "/api/odoo/logout") {
            if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
            if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
        
            const token = getBearer(request);
            if (!token) return json({ ok: false, error: "Missing Authorization Bearer token" }, 401);
        
            const v = await verifyHS256({ token, secret: env.APP_JWT_SECRET });
            if (!v.ok) return json({ ok: false, error: v.error || "Invalid token" }, 401);
        
            await env.ODOO_SESSIONS.delete(kvKeyForOdoo(String(v.payload.sub)));
            return json({ ok: true }, 200);
        }

        /* ==============================
            Whiteboard API (notes/drawings/shares)
        =================================*/
        const whiteboardResponse = await handleWhiteboardApi({
            request,
            env,
            corsHeaders,
            getTokenFromRequest,
            decodeAndValidateToken,
            getProfileByEmail,
        });
        if (whiteboardResponse) return whiteboardResponse;

        /* ==============================
            Tasks API
        =================================*/
        const tasksResponse = await handleTasksApi({
            request,
            env,
            corsHeaders,
            getTokenFromRequest,
            decodeAndValidateToken,
            getProfileByEmail,
        });
        if (tasksResponse) return tasksResponse;

        /* ==============================
            Hiring API
        =================================*/
        const hiringResponse = await handleHiringApi({
            request,
            env,
            corsHeaders,
            getTokenFromRequest,
            decodeAndValidateToken,
            getProfileByEmail,
        });
        if (hiringResponse) return hiringResponse;

        /* ==============================
            E-learning API
        =================================*/
        const elearningResponse = await handleElearningApi({
            request,
            env,
            corsHeaders,
            getTokenFromRequest,
            decodeAndValidateToken,
            getProfileByEmail,
        });
        if (elearningResponse) return elearningResponse;

    // In your Cloudflare Worker
    if (url.pathname === '/api/tracker/event') {
        const body = await request.text();
        const response = await fetch('https://mrbur.odoo.com/web/tracker/event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CF-IPCountry': request.cf?.country || '',
                'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
            },
            body,
        });
        const data = await response.text();
        return new Response(data, {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }
      
        if (url.pathname === "/api/sso/get-session-token" && request.method === "GET") {
            const reqOrigin = request.headers.get("Origin") || "";
            const cookieHeader = request.headers.get("Cookie") || "";
            const sessionMatch = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/i);
            const sessionId = sessionMatch?.[1];

            return new Response(JSON.stringify({ session_id: sessionId || null }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": reqOrigin,
                    "Access-Control-Allow-Credentials": "true",
                },
            });
        }

        if (url.pathname === '/api/sso/set-mrbur-session' && url.hostname === 'app.snabbb.com') {
            const sid = url.searchParams.get('sid');
            const next = url.searchParams.get('next') || 'https://my.mrbur.shop/shop';

            if (!sid) return Response.redirect(next, 302);

            return new Response(null, {
                status: 302,
                headers: {
                    'Location': next,
                    'Set-Cookie': `session_id=${sid}; Path=/; Domain=.mrbur.shop; Max-Age=21600; HttpOnly; Secure; SameSite=Lax`,
                    'Cache-Control': 'no-store',
                },
            });
        }

        if (url.pathname === "/api/sso/mrbur-bridge" && request.method === "GET") {
            const next = url.searchParams.get("next") || "https://my.mrbur.shop";
            const cookieHeader = request.headers.get("Cookie") || "";
            const sessionMatch = cookieHeader.match(/(?:^|;\s*)session_id=([^;]+)/i);
            const sessionId = sessionMatch?.[1];

            if (!sessionId) {
                // Not logged in on snabbb, just redirect to destination
                return new Response(null, {
                    status: 302,
                    headers: { "Location": next, "Cache-Control": "no-store" },
                });
            }
        
            // Redirect to Odoo bridge with the session ID
            const encodedNext = encodeURIComponent(next);
            const targetHost = new URL(next).hostname; // e.g. my.mrbur.shop

            return new Response(null, {
                status: 302,
                headers: {
                    "Location": `https://${targetHost}/sso/snabbb-bridge?sid=${sessionId}&next=${encodedNext}`,
                    "Cache-Control": "no-store",
                },
            });
        }

        function clearCookie(name, domain) {
            return [
                `${name}=`,
                "Path=/",
                domain ? `Domain=${domain}` : "",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                "Max-Age=0",
            ].filter(Boolean).join("; ");
        }

        if (url.hostname === "app.snabbb.com" && url.pathname === "/api/logout") {
            const reqOrigin = request.headers.get("Origin") || "https://app.snabbb.com";
        
            const headers = new Headers({
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
                "Access-Control-Allow-Origin": reqOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Vary": "Origin",
            });
        
            // Main Snabbb SSO cookie
            headers.append("Set-Cookie", clearCookie("mrbur_sso", ".snabbb.com"));
        
            // Also clear possible old/host/domain variants
            headers.append("Set-Cookie", clearCookie("mrbur_sso", "app.snabbb.com"));
            headers.append("Set-Cookie", [
                "mrbur_sso=",
                "Path=/",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                "Max-Age=0",
            ].join("; "));
        
            // Clear Odoo-style session cookies used across your domains
            headers.append("Set-Cookie", clearCookie("session_id", ".snabbb.com"));
            headers.append("Set-Cookie", clearCookie("session_id", ".mrbur.shop"));
            headers.append("Set-Cookie", clearCookie("session_id", ".mrburstudio.com"));
        
            return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers,
            });
        }

        if (url.hostname === "e-learning.snabbb.com" && url.pathname === "/logout") {
            const rawNext = url.searchParams.get("next") || "https://app.snabbb.com";

            let next = "https://app.snabbb.com";

            try {
                const parsedNext = new URL(rawNext);
            
                const allowedNextHosts = [
                    "app.snabbb.com",
                    "snabbb.com",
                ];
            
                if (allowedNextHosts.includes(parsedNext.hostname)) {
                    next = parsedNext.toString();
                }
            } catch {
                // Keep default next URL
            }
        
            const html = `<!doctype html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Signing out...</title>
            <meta name="robots" content="noindex,nofollow" />
        </head>
        <body>
            <p>Signing out...</p>
        
            <script>
                (function () {
                    try {
                        var exactKeys = [
                            "sb-opdotszsldcgwjqtvgul-auth-token",
                            "sb-opdotszsldcgwjqtvgul-auth-token-code-verifier",
                            "supabase.auth.token",
                            "auth-storage",
                            "authStore",
                            "user",
                            "profile",
                            "session"
                        ];
        
                        function shouldDeleteKey(key) {
                            var lower = String(key || "").toLowerCase();
        
                            return (
                                exactKeys.indexOf(key) !== -1 ||
                                key.indexOf("sb-") === 0 ||
                                lower.indexOf("supabase") !== -1 ||
                                lower.indexOf("auth-token") !== -1 ||
                                lower.indexOf("code-verifier") !== -1
                            );
                        }
        
                        [window.localStorage, window.sessionStorage].forEach(function (storage) {
                            if (!storage) return;
        
                            Object.keys(storage).forEach(function (key) {
                                if (shouldDeleteKey(key)) {
                                    storage.removeItem(key);
                                }
                            });
                        });
                    } catch (e) {
                        console.warn("Storage cleanup failed", e);
                    }
        
                    window.location.replace(${JSON.stringify(next)});
                })();
            </script>
        </body>
        </html>`;
        
            const headers = new Headers({
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            });
        
            // Clear shared Snabbb cookies
            headers.append(
                "Set-Cookie",
                "mrbur_sso=; Path=/; Domain=.snabbb.com; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
            );
        
            headers.append(
                "Set-Cookie",
                "session_id=; Path=/; Domain=.snabbb.com; Max-Age=0; HttpOnly; Secure; SameSite=None"
            );
        
            // Clear host-only cookies on e-learning.snabbb.com
            headers.append(
                "Set-Cookie",
                "mrbur_sso=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax"
            );
        
            headers.append(
                "Set-Cookie",
                "session_id=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None"
            );
        
            return new Response(html, {
                status: 200,
                headers,
            });
        }

        // =====================================================
        // Snabbb Reward Redeem Proxy
        // reward.snabbb.com -> app.snabbb.com/api/reward/redeem -> Odoo
        // =====================================================
        if (url.pathname === "/api/reward/redeem") {
            const reqOrigin = request.headers.get("Origin") || "";
            const allowedRewardOrigins = new Set([
                "https://reward.snabbb.com",
                "https://app.snabbb.com",
                "http://localhost:3000",
                "http://localhost:5173",
            ]);
        
            const corsOrigin = allowedRewardOrigins.has(reqOrigin)
                ? reqOrigin
                : "https://reward.snabbb.com";
        
            const rewardCorsHeaders = {
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin",
            };
        
            if (request.method === "OPTIONS") {
                return new Response(null, {
                    status: 204,
                    headers: rewardCorsHeaders,
                });
            }
        
            if (request.method !== "POST") {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "method_not_allowed",
                    method: request.method,
                }), {
                    status: 405,
                    headers: {
                        "Content-Type": "application/json",
                        ...rewardCorsHeaders,
                    },
                });
            }
        
            try {
                const apiKey = env.SNABBB_REWARD_API_KEY;
            
                if (!apiKey) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "missing_worker_reward_api_key",
                        fix: "Set Cloudflare Worker secret SNABBB_REWARD_API_KEY to the same value as Odoo System Parameter snabbb_reward.api_key.",
                    }), {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json",
                            ...rewardCorsHeaders,
                        },
                    });
                }
            
                const body = await request.json().catch(() => null);
            
                if (!body) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "invalid_json_body",
                    }), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            ...rewardCorsHeaders,
                        },
                    });
                }
            
                const payload =
                    body.params && typeof body.params === "object"
                        ? body.params
                        : body;
            
                if (!payload.email) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "missing_email",
                        received_payload_keys: Object.keys(payload),
                    }), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            ...rewardCorsHeaders,
                        },
                    });
                }
            
                if (!payload.reward_code && !payload.reward_id) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "missing_reward_code_or_reward_id",
                        received_payload_keys: Object.keys(payload),
                    }), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            ...rewardCorsHeaders,
                        },
                    });
                }
            
                const upstreamUrl = new URL("https://mrbur.odoo.com/snabbb/reward/api/redeem");
                upstreamUrl.searchParams.set("api_key", apiKey);
            
                const upstreamBody = {
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        email: payload.email,
                        reward_id: payload.reward_id || false,
                        reward_code: payload.reward_code || false,
                        website_domain: payload.website_domain || "reward.snabbb.com",
                        external_ref: payload.external_ref || `worker-reward-${Date.now()}`,
                    },
                };
            
                const odooRes = await fetch(upstreamUrl.toString(), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Snabbb-Api-Key": apiKey,
                    },
                    body: JSON.stringify(upstreamBody),
                });
            
                const rawText = await odooRes.text();
            
                let parsed = null;
                try {
                    parsed = rawText ? JSON.parse(rawText) : null;
                } catch {
                    parsed = null;
                }
            
                const finalPayload = parsed?.result || parsed;
            
                if (!odooRes.ok) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "odoo_redeem_upstream_failed",
                        upstream_status: odooRes.status,
                        upstream_content_type: odooRes.headers.get("Content-Type"),
                        upstream_response: finalPayload || rawText.slice(0, 2000),
                    }), {
                        status: 502,
                        headers: {
                            "Content-Type": "application/json",
                            ...rewardCorsHeaders,
                        },
                    });
                }
            
                if (!finalPayload) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "empty_odoo_response",
                        upstream_status: odooRes.status,
                    }), {
                        status: 502,
                        headers: {
                            "Content-Type": "application/json",
                            ...rewardCorsHeaders,
                        },
                    });
                }
            
                return new Response(JSON.stringify(finalPayload), {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        ...rewardCorsHeaders,
                    },
                });
            
            } catch (err) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "worker_exception",
                    message: err?.message || String(err),
                    stack: err?.stack || null,
                }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...rewardCorsHeaders,
                    },
                });
            }
        }

        // =====================================================
        // Snabbb Reward List Proxy
        // reward.snabbb.com -> app.snabbb.com/api/reward/rewards -> Odoo
        // =====================================================
        if (url.pathname === "/api/reward/rewards") {
            const reqOrigin = request.headers.get("Origin") || "";
            const allowedRewardOrigins = new Set([
                "https://reward.snabbb.com",
                "https://app.snabbb.com",
                "http://localhost:3000",
                "http://localhost:5173",
            ]);
        
            const corsOrigin = allowedRewardOrigins.has(reqOrigin)
                ? reqOrigin
                : "https://reward.snabbb.com";
        
            const rewardCorsHeaders = {
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin",
            };
        
            if (request.method === "OPTIONS") {
                return new Response(null, {
                    status: 204,
                    headers: rewardCorsHeaders,
                });
            }
        
            if (request.method !== "GET") {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "method_not_allowed",
                }), {
                    status: 405,
                    headers: {
                        "Content-Type": "application/json",
                        ...rewardCorsHeaders,
                    },
                });
            }
        
            try {
                const apiKey = env.SNABBB_REWARD_API_KEY;
            
                if (!apiKey) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "missing_worker_reward_api_key",
                    }), {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json",
                            ...rewardCorsHeaders,
                        },
                    });
                }
            
                const upstreamUrl = new URL("https://mrbur.odoo.com/snabbb/reward/api/rewards");
            
                upstreamUrl.searchParams.set("api_key", apiKey);
            
                const email = url.searchParams.get("email");
                const requestedScope = url.searchParams.get("website_scope") || url.searchParams.get("website_domain") || "MMY";

                if (email) upstreamUrl.searchParams.set("email", email);
                upstreamUrl.searchParams.set("website_scope", requestedScope);
                upstreamUrl.searchParams.set("website_domain", requestedScope);
            
                const odooRes = await fetch(upstreamUrl.toString(), {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "X-Snabbb-Api-Key": apiKey,
                    },
                });
            
                const rawText = await odooRes.text();
            
                return new Response(rawText || JSON.stringify({
                    ok: false,
                    error: "empty_odoo_response",
                }), {
                    status: odooRes.status >= 200 && odooRes.status <= 599 ? odooRes.status : 502,
                    headers: {
                        "Content-Type": odooRes.headers.get("Content-Type") || "application/json",
                        ...rewardCorsHeaders,
                    },
                });
            
            } catch (err) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "reward_list_proxy_failed",
                    message: err?.message || String(err),
                }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...rewardCorsHeaders,
                    },
                });
            }
        }

        // Add inside Cloudflare Worker fetch(request, env), before final fallback.
        // Frontend calls: https://app.snabbb.com/api/reward/my?email=...&website_domain=reward.snabbb.com
        if (url.pathname === "/api/reward/my") {
            const reqOrigin = request.headers.get("Origin") || "";
            const allowedRewardOrigins = new Set([
                "https://reward.snabbb.com",
                "https://app.snabbb.com",
                "http://localhost:3000",
                "http://localhost:5173",
            ]);
        
            const corsOrigin = allowedRewardOrigins.has(reqOrigin)
                ? reqOrigin
                : "https://reward.snabbb.com";
        
            const rewardCorsHeaders = {
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin",
            };
        
            if (request.method === "OPTIONS") {
                return new Response(null, { status: 204, headers: rewardCorsHeaders });
            }
        
            if (request.method !== "GET") {
                return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
                    status: 405,
                    headers: { "Content-Type": "application/json", ...rewardCorsHeaders },
                });
            }
        
            try {
                const apiKey = env.SNABBB_REWARD_API_KEY;
                if (!apiKey) {
                    return new Response(JSON.stringify({ ok: false, error: "missing_worker_reward_api_key" }), {
                        status: 500,
                        headers: { "Content-Type": "application/json", ...rewardCorsHeaders },
                    });
                }
            
                const upstreamUrl = new URL("https://mrbur.odoo.com/snabbb/reward/api/my");
                upstreamUrl.searchParams.set("api_key", apiKey);
            
                const email = url.searchParams.get("email");
                const websiteDomain = url.searchParams.get("website_domain") || "reward.snabbb.com";
            
                if (email) upstreamUrl.searchParams.set("email", email);
                upstreamUrl.searchParams.set("website_domain", websiteDomain);
            
                const odooRes = await fetch(upstreamUrl.toString(), {
                    method: "GET",
                    headers: {
                        "Accept": "application/json",
                        "X-Snabbb-Api-Key": apiKey,
                    },
                });
            
                const rawText = await odooRes.text();
            
                return new Response(rawText || JSON.stringify({ ok: false, error: "empty_odoo_response" }), {
                    status: odooRes.status >= 200 && odooRes.status <= 599 ? odooRes.status : 502,
                    headers: {
                        "Content-Type": odooRes.headers.get("Content-Type") || "application/json",
                        ...rewardCorsHeaders,
                    },
                });
            } catch (err) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "reward_my_proxy_failed",
                    message: err?.message || String(err),
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json", ...rewardCorsHeaders },
                });
            }
        }

        // =====================================================
        // Snabbb Virtual Pet Odoo State Proxy
        // Frontend: app.snabbb.com/api/virtual-pet/state
        // Odoo:          mrbur.odoo.com/snabbb/virtual_pet/api/state
        // =====================================================
        if (url.pathname === "/api/virtual-pet/state") {
            const reqOrigin = request.headers.get("Origin") || "";
            const allowedOrigins = new Set([
                "https://app.snabbb.com",
                "https://reward.snabbb.com",
                "http://localhost:3000",
                "http://localhost:5173",
            ]);
        
            const corsOrigin = allowedOrigins.has(reqOrigin)
                ? reqOrigin
                : "https://app.snabbb.com";
        
            const virtualPetCorsHeaders = {
                "Access-Control-Allow-Origin": corsOrigin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-Requested-With",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin",
            };
        
            if (request.method === "OPTIONS") {
                return new Response(null, {
                    status: 204,
                    headers: virtualPetCorsHeaders,
                });
            }
        
            if (request.method !== "GET" && request.method !== "POST") {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "method_not_allowed",
                }), {
                    status: 405,
                    headers: {
                        "Content-Type": "application/json",
                        ...virtualPetCorsHeaders,
                    },
                });
            }
        
            try {
                const apiKey =
                    env.SNABBB_VIRTUAL_PET_API_KEY ||
                    env.SNABBB_REWARD_API_KEY ||
                    env.SNABBB_API_KEY;
            
                if (!apiKey) {
                    return new Response(JSON.stringify({
                        ok: false,
                        error: "missing_worker_virtual_pet_api_key",
                        fix: "Set Cloudflare Worker secret SNABBB_VIRTUAL_PET_API_KEY. It can use the same value as Odoo snabbb_virtual_pet.api_key.",
                    }), {
                        status: 500,
                        headers: {
                            "Content-Type": "application/json",
                            ...virtualPetCorsHeaders,
                        },
                    });
                }
            
                const upstreamUrl = new URL("https://mrbur.odoo.com/snabbb/virtual_pet/api/state");
                upstreamUrl.searchParams.set("api_key", apiKey);
            
                if (request.method === "GET") {
                    const email = url.searchParams.get("email");
                    const externalUserId = url.searchParams.get("external_user_id");
                    const supabaseUserId = url.searchParams.get("supabase_user_id");
                
                    if (email) upstreamUrl.searchParams.set("email", email);
                    if (externalUserId) upstreamUrl.searchParams.set("external_user_id", externalUserId);
                    if (supabaseUserId) upstreamUrl.searchParams.set("supabase_user_id", supabaseUserId);
                
                    const odooRes = await fetch(upstreamUrl.toString(), {
                        method: "GET",
                        headers: {
                            "Accept": "application/json",
                            "X-Snabbb-Api-Key": apiKey,
                        },
                    });
                
                    const rawText = await odooRes.text();
                
                    return new Response(rawText || JSON.stringify({
                        ok: false,
                        error: "empty_odoo_response",
                    }), {
                        status: odooRes.status >= 200 && odooRes.status <= 599 ? odooRes.status : 502,
                        headers: {
                            "Content-Type": odooRes.headers.get("Content-Type") || "application/json",
                            ...virtualPetCorsHeaders,
                        },
                    });
                }
            
                const body = await request.json().catch(() => ({}));
                const payload =
                    body?.params && typeof body.params === "object"
                        ? body.params
                        : body;
            
                const upstreamBody = {
                    jsonrpc: "2.0",
                    method: "call",
                    params: {
                        email: payload.email,
                        external_user_id: payload.external_user_id || payload.externalUserId,
                        supabase_user_id: payload.supabase_user_id || payload.supabaseUserId,
                        pet_name: payload.pet_name,
                        has_adopted_pet: payload.has_adopted_pet,
                        stats: payload.stats || {},
                        inventory: payload.inventory || {},
                        is_sleeping: payload.is_sleeping,
                        active_ball_id: payload.active_ball_id,
                        active_bed_id: payload.active_bed_id,
                    },
                };
            
                const odooRes = await fetch(upstreamUrl.toString(), {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-Snabbb-Api-Key": apiKey,
                    },
                    body: JSON.stringify(upstreamBody),
                });
            
                const rawText = await odooRes.text();
            
                return new Response(rawText || JSON.stringify({
                    ok: false,
                    error: "empty_odoo_response",
                }), {
                    status: odooRes.status >= 200 && odooRes.status <= 599 ? odooRes.status : 502,
                    headers: {
                        "Content-Type": odooRes.headers.get("Content-Type") || "application/json",
                        ...virtualPetCorsHeaders,
                    },
                });
            
            } catch (err) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: "virtual_pet_proxy_failed",
                    message: err?.message || String(err),
                }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        ...virtualPetCorsHeaders,
                    },
                });
            }
        }



/* ===============================
      GET SNABBB CREDIT FOR REWARD APP
      ============================ */
// Known mismatches between Odoo's generic company.code and the actual Snabbb Reward
// website code the wallet/reward APIs are scoped by. "MIN" is PT. MRBUR GLOBAL INDONESIA's
// company code, but its wallet/reward data is filed under website code "MID". Add more
// entries here if other companies drift the same way.
const WEBSITE_SCOPE_CORRECTIONS = { MIN: "MID" };

function resolveWebsiteScope(rawScope) {
    const normalized = (rawScope || "").trim().toUpperCase();
    return WEBSITE_SCOPE_CORRECTIONS[normalized] || rawScope;
}

if (url.pathname === "/api/inventory/activity" && request.method === "POST") {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400, headers: corsHeaders }
        );
    }

    const {
        external_ref,
        actor_email,
        actor_name = null,
        supabase_user_id = null,
        action,
        room_id,
        room_name = null,
        details,
        before_value = null,
        after_value = null,
        occurred_at,
        website_scope: rawScope,
        session_duration_seconds = null,
        page_path = null,
        page_duration_seconds = null,
        source_tab = null,
    } = body || {};

    if (!external_ref || !actor_email || !action || !room_id || !details || !occurred_at) {
        return Response.json(
            {
                ok: false,
                error: "Missing required field(s): external_ref, actor_email, action, room_id, details, occurred_at",
            },
            { status: 400, headers: corsHeaders }
        );
    }

    if (!INVENTORY_ACTIVITY_ACTIONS.has(action)) {
        return Response.json(
            { ok: false, error: `Unknown action "${action}"` },
            { status: 400, headers: corsHeaders }
        );
    }

    // Same MIN->MID style correction as the wallet handler, in case the
    // inventory app ever needs to scope activity by website/company too.
    // Defaults to "MMY" the same way wallet does when nothing is supplied.
    const websiteScope = resolveWebsiteScope(rawScope || "MMY");

    try {
        const odooRes = await fetch(ODOO_ACTIVITY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Snabbb-Api-Key": env.SNABBB_API_KEY,
            },
            body: JSON.stringify({
                external_ref,
                email: actor_email,
                actor_name,
                supabase_user_id,
                action,
                room_id,
                room_name,
                details,
                before_value,
                after_value,
                occurred_at,
                website_scope: websiteScope,
                ...(session_duration_seconds !== null && { session_duration_seconds }),
                ...(page_path !== null && { page_path }),
                ...(page_duration_seconds !== null && { page_duration_seconds }),
                ...(source_tab !== null && { source_tab }),
            }),
        });

        const data = await odooRes.json().catch(() => null);

        if (!odooRes.ok || !data?.ok) {
            return Response.json(
                { ok: false, error: data?.error || "activity_upstream_failed", upstream: data },
                { status: odooRes.status || 400, headers: corsHeaders }
            );
        }

        return Response.json(
            { ok: true, external_ref },
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        return Response.json(
            { ok: false, error: error?.message || "activity_failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

if (url.pathname === "/api/appointment/activity" && request.method === "POST") {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400, headers: corsHeaders }
        );
    }

    const {
        external_ref,
        actor_email,
        actor_name = null,
        supabase_user_id = null,
        clinic_id = null,
        type,
        description,
        occurred_at,
        page_path = null,
        page_duration_seconds = null,
    } = body || {};

    if (!external_ref || !actor_email || !type || !description || !occurred_at) {
        return Response.json(
            {
                ok: false,
                error: "Missing required field(s): external_ref, actor_email, type, description, occurred_at",
            },
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const odooRes = await fetch(ODOO_APPOINTMENT_ACTIVITY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Snabbb-Api-Key": env.SNABBB_API_KEY,
            },
            body: JSON.stringify({
                external_ref,
                email: actor_email,
                actor_name,
                supabase_user_id,
                clinic_id,
                action: type,
                details: description,
                occurred_at,
                ...(page_path !== null && { page_path }),
                ...(page_duration_seconds !== null && { page_duration_seconds }),
            }),
        });

        const data = await odooRes.json().catch(() => null);

        if (!odooRes.ok || !data?.ok) {
            return Response.json(
                { ok: false, error: data?.error || "activity_upstream_failed", upstream: data },
                { status: odooRes.status || 400, headers: corsHeaders }
            );
        }

        return Response.json(
            { ok: true, external_ref },
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        return Response.json(
            { ok: false, error: error?.message || "activity_failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

 /* ==============================
       ACTIVITY LOG SYNC
       Forwards to-do activity events (including page-view duration
       events from usePageDurationTracker) to the todo_activity_log Odoo
       module. This worker is the live Cloudflare Pages worker for
       todo.snabbb.com, so — unlike the inventory/appointment apps —
       there's no separate shared cross-app worker to update; this route
       lives directly here.
       ============================== */
    if (url.pathname === '/api/todo/activity') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const {
        external_ref,
        actor_email,
        actor_name = null,
        supabase_user_id = null,
        action,
        details,
        occurred_at,
        page_path = null,
        page_duration_seconds = null,
      } = body || {};

      if (!external_ref || !actor_email || !action || !details || !occurred_at) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Missing required field(s): external_ref, actor_email, action, details, occurred_at',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      try {
        const odooUrl = 'https://mrbur.odoo.com/snabbb/api/todo/activity';
        const odooRes = await fetch(odooUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Snabbb-Api-Key': env.SNABBB_API_KEY,
          },
          body: JSON.stringify({
            external_ref,
            email: actor_email,
            actor_name,
            supabase_user_id,
            action,
            details,
            occurred_at,
            ...(page_path !== null && { page_path }),
            ...(page_duration_seconds !== null && { page_duration_seconds }),
          }),
        });

        const data = await odooRes.json().catch(() => null);

        if (!odooRes.ok || data?.ok === false) {
          return new Response(
            JSON.stringify({ ok: false, error: data?.error || 'activity_upstream_failed', upstream: data }),
            { status: odooRes.status || 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        return new Response(JSON.stringify({ ok: true, external_ref }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: err?.message || 'activity_failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

/**
 * Forwards a to-do activity event to Odoo, same X-Snabbb-Api-Key + email
 * auth model as the inventory and appointment apps' activity syncs. Unlike
 * those two, there's no shared cross-app worker or pre-existing
 * `/api/activity` route in this file to collide with — this route is native
 * to this worker.
 */
async function forwardTodoActivity(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const {
    external_ref,
    actor_email,
    actor_name = null,
    supabase_user_id = null,
    action,
    details,
    occurred_at,
  } = body || {};

  if (!external_ref || !actor_email || !action || !details || !occurred_at) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Missing required field(s): external_ref, actor_email, action, details, occurred_at',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const odooRes = await fetch(ODOO_TODO_ACTIVITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Snabbb-Api-Key': env.SNABBB_API_KEY,
      },
      body: JSON.stringify({
        external_ref,
        email: actor_email,
        actor_name,
        supabase_user_id,
        action,
        details,
        occurred_at,
      }),
    });

    const data = await odooRes.json().catch(() => null);

    if (!odooRes.ok || !data?.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: data?.error || 'activity_upstream_failed', upstream: data }),
        { status: odooRes.status || 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ ok: true, external_ref }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error?.message || 'activity_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

    /* ==============================
       TODO TRACKER SYNC
       ============================== */
    if (url.pathname === '/api/todo/activity') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
      }
      return forwardTodoActivity(request, env, corsHeaders);
    }

    if (url.pathname === "/api/elearning/activity" && request.method === "POST") {
    let body;
    try {
        body = await request.json();
    } catch {
        return Response.json(
            { ok: false, error: "Invalid JSON body" },
            { status: 400, headers: corsHeaders }
        );
    }

    const {
        external_ref,
        actor_email,
        actor_name = null,
        supabase_user_id = null,
        action,
        details,
        occurred_at,
        page_path = null,
        page_duration_seconds = null,
    } = body || {};

    if (!external_ref || !actor_email || !action || !details || !occurred_at) {
        return Response.json(
            {
                ok: false,
                error: "Missing required field(s): external_ref, actor_email, action, details, occurred_at",
            },
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const odooRes = await fetch(ODOO_ELEARNING_ACTIVITY_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Snabbb-Api-Key": env.SNABBB_API_KEY,
            },
            body: JSON.stringify({
                external_ref,
                email: actor_email,
                actor_name,
                supabase_user_id,
                action,
                details,
                occurred_at,
                ...(page_path !== null && { page_path }),
                ...(page_duration_seconds !== null && { page_duration_seconds }),
            }),
        });

        const data = await odooRes.json().catch(() => null);

        if (!odooRes.ok || !data?.ok) {
            return Response.json(
                { ok: false, error: data?.error || "activity_upstream_failed", upstream: data },
                { status: odooRes.status || 400, headers: corsHeaders }
            );
        }

        return Response.json(
            { ok: true, external_ref },
            { status: 200, headers: corsHeaders }
        );
    } catch (error) {
        return Response.json(
            { ok: false, error: error?.message || "activity_failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

// ── UNIFIED SHOP: product catalog (MR.BUR + Kaneiko) ───────────────────
// Proxies to the unified_shop_api Odoo module's public, read-only
// /api/unified-shop/products endpoint. Plain JSON in, plain JSON out —
// same pass-through convention as the reward-api routes above.
//
// Includes CORS handling because the local dev server runs on a different
// origin (e.g. http://192.168.0.127:3000) than production (app.snabbb.com),
// so this is a genuine cross-origin call there even though it's same-origin
// once deployed. credentials: 'include' on the frontend fetch means the
// Allow-Origin header has to be the specific request origin, not "*".
if (url.pathname === "/api/unified-shop/products") {
  const origin = request.headers.get("Origin") || "";
  const unifiedShopCorsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: unifiedShopCorsHeaders });
  }

  if (request.method === "POST") {
    try {
      const payload = await request.text(); // forward the raw JSON body as-is

      const odooRes = await fetch(`https://${ODOO_SHOP_HOST}/api/unified-shop/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      const rawText = await odooRes.text();

      return new Response(rawText || JSON.stringify({ products: [], total: 0, categories: [] }), {
        status: odooRes.status >= 200 && odooRes.status <= 599 ? odooRes.status : 502,
        headers: {
          "Content-Type": odooRes.headers.get("Content-Type") || "application/json",
          ...unifiedShopCorsHeaders,
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...unifiedShopCorsHeaders },
      });
    }
  }
}

 /* ==============================
       CALCULATOR TRACKER SYNC
       ============================== */
       /**
 * Forwards a calculator activity event to Odoo, same X-Snabbb-Api-Key +
 * email auth model as the inventory/appointment/todo/e-learning activity
 * syncs. There's no pre-existing `/api/activity` route in this file to
 * collide with.
 */

       function jsonResponse(
  body,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        'Content-Type':
          'application/json',
        'Cache-Control':
          'no-store',
      },
    }
  );
}

async function handleActivityRequest(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const {
    external_ref,
    actor_email,
    actor_name = null,
    supabase_user_id = null,
    action,
    details,
    occurred_at,
    page_path = null,
    page_duration_seconds = null,
  } = body || {};

  if (!external_ref || !actor_email || !action || !details || !occurred_at) {
    return jsonResponse(
      {
        ok: false,
        error: 'Missing required field(s): external_ref, actor_email, action, details, occurred_at',
      },
      400
    );
  }

  try {
    const odooRes = await fetch(ODOO_CALCULATOR_ACTIVITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Snabbb-Api-Key': env.SNABBB_API_KEY,
      },
      body: JSON.stringify({
        external_ref,
        email: actor_email,
        actor_name,
        supabase_user_id,
        action,
        details,
        occurred_at,
        ...(page_path !== null && { page_path }),
        ...(page_duration_seconds !== null && { page_duration_seconds }),
      }),
    });

    const data = await odooRes.json().catch(() => null);

    if (!odooRes.ok || !data?.ok) {
      return jsonResponse(
        { ok: false, error: data?.error || 'activity_upstream_failed', upstream: data },
        odooRes.status || 400
      );
    }

    return jsonResponse({ ok: true, external_ref });
  } catch (error) {
    return jsonResponse({ ok: false, error: error?.message || 'activity_failed' }, 500);
  }
}

    if (
      url.pathname ===
      '/api/calculator/activity'
    ) {
      return handleActivityRequest(
        request,
        env
      );
    }

if (url.pathname === "/api/wallet" && request.method === "GET") {
    const email = url.searchParams.get("email");
    const websiteScope = resolveWebsiteScope(
        url.searchParams.get("website_scope") ||
        url.searchParams.get("website_domain") ||
        "MMY"
    );

    if (!email) {
        return Response.json(
            { ok: false, error: "Missing email" },
            { status: 400, headers: corsHeaders }
        );
    }

    try {
        const odooUrl = new URL("https://mrbur.odoo.com/snabbb/reward/api/wallet/my");
        odooUrl.searchParams.set("email", email);
        odooUrl.searchParams.set("website_scope", websiteScope);
        odooUrl.searchParams.set("website_domain", websiteScope);

        const odooRes = await fetch(odooUrl.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-Snabbb-Api-Key": env.SNABBB_API_KEY,
            },
        });

        const data = await odooRes.json();

        if (!odooRes.ok || !data.ok) {
            return Response.json(
                {
                    ok: false,
                    error: data.error || "wallet_upstream_failed",
                    upstream: data,
                },
                { status: odooRes.status || 400, headers: corsHeaders }
            );
        }

        const balance = Number(
            data.snabbb_balance ??
            data.balance ??
            data.data?.balance ??
            0
        );

        return Response.json(
            {
                ok: true,
                data: {
                    balance,
                },
                upstream: data,
            },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        return Response.json(
            { ok: false, error: error?.message || "wallet_failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

/* ==============================
   ✅ E-LEARNING: Snabbb partner product search
   GET /api/products/search?q=&limit= -> Odoo /api/v1/products/search
   (proxies the snabbb_elearning_products Odoo module's search endpoint)
============================== */
if (url.pathname === "/api/products/search" && request.method === "GET") {
    try {
        const odooUrl = new URL("https://mrbur.odoo.com/api/v1/products/search");
        const q = url.searchParams.get("q");
        const limit = url.searchParams.get("limit") || "20";
        if (q) odooUrl.searchParams.set("q", q);
        odooUrl.searchParams.set("limit", limit);

        const odooRes = await fetch(odooUrl.toString(), {
            method: "GET",
            headers: {
                Accept: "application/json",
                "X-SSO-API-KEY": env.ODOO_SSO_API_KEY,
            },
        });

        const data = await odooRes.json().catch(() => null);

        if (!odooRes.ok || data?.error) {
            return Response.json(
                { ok: false, error: data?.error || "product_search_upstream_failed" },
                { status: odooRes.status || 502, headers: corsHeaders }
            );
        }

        return Response.json(
            { ok: true, products: data?.products || [] },
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        return Response.json(
            { ok: false, error: err?.message || "product_search_failed" },
            { status: 500, headers: corsHeaders }
        );
    }
}

        /* ==============================
           ✅ E-LEARNING: purchase webhook passthrough
           POST /api/products/purchase-webhook -> Cloudflare Pages Functions
           (keeps the Supabase + credit-award logic in one place: the E-Learning
           repo's functions/api/products/purchase-webhook.ts. That code only runs
           on this Pages project's own domain, which this worker's route doesn't
           cover, so we forward the raw request there and pass the response back.)
        ============================== */
        if (url.pathname === "/api/products/purchase-webhook" && request.method === "POST") {
            const pagesOrigin = (env.ELEARNING_PAGES_ORIGIN || "https://e-learning.snabbb.com").replace(/\/$/, "");
        
            try {
                const upstreamRes = await fetch(`${pagesOrigin}/api/products/purchase-webhook`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-Snabbb-Webhook-Secret": request.headers.get("X-Snabbb-Webhook-Secret") || "",
                    },
                    body: await request.text(),
                });
            
                const data = await upstreamRes.json().catch(() => null);
                return Response.json(data ?? { ok: false, error: "empty_upstream_response" }, {
                    status: upstreamRes.status,
                    headers: corsHeaders,
                });
            } catch (err) {
                return Response.json(
                    { ok: false, error: err?.message || "purchase_webhook_proxy_failed" },
                    { status: 502, headers: corsHeaders }
                );
            }
        }

        /* ==============================
           ✅ E-LEARNING: Mux direct-upload URL passthrough
           POST /api/get-mux-upload-url -> Cloudflare Pages Functions
        ============================== */
        if (url.pathname === "/api/get-mux-upload-url" && request.method === "POST") {
            const pagesOrigin = (env.ELEARNING_PAGES_ORIGIN || "https://dental-learn-frontend.pages.dev").replace(/\/$/, "");
        
            try {
                const upstreamRes = await fetch(`${pagesOrigin}/api/get-mux-upload-url`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: request.headers.get("Authorization") || "",
                    },
                });
            
                const text = await upstreamRes.text();
                return new Response(text, {
                    status: upstreamRes.status,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } catch (err) {
                return Response.json(
                    { error: err?.message || "mux_upload_url_proxy_failed" },
                    { status: 502, headers: corsHeaders }
                );
            }
        }

        /* ==============================
           ✅ E-LEARNING: Mux webhook passthrough
           POST /api/mux-webhook -> Cloudflare Pages Functions
           (Mux calls this directly when an asset finishes processing; forwards to
           functions/api/mux-webhook.ts, which flips videos.status to 'published')
        ============================== */
        if (url.pathname === "/api/mux-webhook" && request.method === "POST") {
            const pagesOrigin = (env.ELEARNING_PAGES_ORIGIN || "https://dental-learn-frontend.pages.dev").replace(/\/$/, "");
        
            try {
                const upstreamRes = await fetch(`${pagesOrigin}/api/mux-webhook`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: await request.text(),
                });
            
                const text = await upstreamRes.text();
                return new Response(text, {
                    status: upstreamRes.status,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            } catch (err) {
                return Response.json(
                    { error: err?.message || "mux_webhook_proxy_failed" },
                    { status: 502, headers: corsHeaders }
                );
            }
        }

        /* =========================================================
   Paste into the Worker's worker.js
   ========================================================= */

// 1) Add this import at the top of worker.js, next to the other
//    ./supabase/*.js imports:
//
//    import { getDentalChart, upsertDentalChart } from "./supabase/dentalCharts.js";


// 2) Add this route block anywhere alongside the other cookie-authed
//    /api/inventory/* routes (same auth pattern: getTokenFromRequest +
//    decodeAndValidateToken + getProfileByEmail, exactly like
//    /api/inventory/meta).
//
//    GET  /api/dental/chart?patient_id=XYZ   -> latest saved chart
//    POST /api/dental/chart                  -> upsert a chart snapshot

// supabase/dentalCharts.js
//
// Drop this file into the Worker project's supabase/ folder, next to
// profiles.js, appointments.js, patients.js, etc.
//
// Server-side only. Talks to Supabase's PostgREST REST API directly with
// the service-role key (same low-level fetch() style the rest of this
// project's supabase/*.js modules use — no supabase-js SDK needed in a
// Worker). RLS is bypassed here on purpose; the route handler in worker.js
// is what scopes every read/write to the authenticated user_id.

const TABLE = "dental_charts";

function restUrl(env, path) {
  return `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
}

function restHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * Latest saved chart for a given patient, scoped to the clinician who owns it.
 * Returns null if nothing has been saved yet.
 */
 async function getDentalChart(env, userId, patientId) {
  const url =
    restUrl(env, TABLE) +
    `?user_id=eq.${encodeURIComponent(userId)}` +
    `&patient_id=eq.${encodeURIComponent(patientId)}` +
    `&order=visit_date.desc&limit=1`;

  const res = await fetch(url, { headers: restHeaders(env) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase getDentalChart failed (${res.status}): ${text}`);
  }
  const rows = await res.json();
  return rows[0] || null;
}

/**
 * Upserts a chart snapshot for (user_id, patient_id, visit_date). Saving
 * the same patient on the same visit_date again overwrites that day's
 * snapshot; a new visit_date creates a new row (per-visit history).
 */
 async function upsertDentalChart(env, userId, payload) {
  const row = {
    user_id: userId,
    patient_id: payload.patient_id,
    patient: payload.patient || {},
    visit_date: payload.visit_date || new Date().toISOString().slice(0, 10),
    chart_mode: payload.chart_mode || "permanent",
    chart_data: payload.chart_data || {},
    updated_at: new Date().toISOString(),
  };

  const url = restUrl(env, TABLE) + "?on_conflict=user_id,patient_id,visit_date";

  const res = await fetch(url, {
    method: "POST",
    headers: restHeaders(env, {
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase upsertDentalChart failed (${res.status}): ${text}`);
  }

  const rows = await res.json();
  return rows[0] || row;
}

if (url.pathname === "/api/dental/chart") {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Cookie-based auth (mrbur_sso), same as Inventory.
    const token = getTokenFromRequest(request);
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const decoded = decodeAndValidateToken(token);
    if (!decoded.ok) {
        return new Response("Unauthorized", {
            status: 401,
            headers: {
                ...(decoded.error === "expired" ? { "Set-Cookie": buildClearCookie() } : {}),
                ...corsHeaders,
            },
        });
    }

    let profile;
    try {
        profile = await getProfileByEmail(env, decoded.email);
    } catch (e) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
    }
    if (!profile) {
        return new Response("User not found", { status: 403, headers: corsHeaders });
    }

    if (request.method === "GET") {
        const patientId = url.searchParams.get("patient_id");
        if (!patientId) {
            return new Response(JSON.stringify({ ok: false, error: "Missing patient_id" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
        try {
            const workspace = await resolveWorkspaceContext(env, profile);
            const chart = await getDentalChart(env, workspace.workspaceUserId, patientId);
            if (!chart) {
                return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
                    status: 404,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }
            return new Response(JSON.stringify({ ok: true, chart }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: e.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
    }

    if (request.method === "POST") {
        let body;
        try {
            body = await request.json();
        } catch {
            return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        if (!body?.patient_id) {
            return new Response(JSON.stringify({ ok: false, error: "Missing patient_id" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        try {
            const workspace = await resolveWorkspaceContext(env, profile);
            const chart = await upsertDentalChart(env, workspace.workspaceUserId, body);
            return new Response(JSON.stringify({ ok: true, chart }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: e.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
    }

    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
}

/* ==============================
      ✅ ACCESS CONTROL
      POST /api/company-invitations
============================== */
    if (
    url.pathname === "/api/company/access-context" &&
    request.method === "GET"
    ) {
    try {
        const token = getTokenFromRequest(request);

        if (!token) {
        return Response.json(
            {
            ok: false,
            error: "Unauthorized",
            },
            {
            status: 401,
            headers: corsHeaders,
            }
        );
        }

        const decoded = decodeAndValidateToken(token);

        if (!decoded.ok) {
        return Response.json(
            {
            ok: false,
            error: decoded.error || "Unauthorized",
            },
            {
            status: 401,
            headers: {
                ...(decoded.error === "expired"
                ? { "Set-Cookie": buildClearCookie() }
                : {}),
                ...corsHeaders,
            },
            }
        );
        }

        const app =
        url.searchParams.get("app") || "appointment";

        // New mini-app sessions authenticate with a real Supabase Bearer token.
        // Resolve that stable user_id first; retain the Odoo email lookup only as
        // a compatibility fallback for older clients.
        let profile = await getProfileFromSupabaseBearer(env, request);
        if (!profile) {
            profile = await getProfileByEmail(env, decoded.email);
        }

        if (!profile) {
        return Response.json(
            {
            ok: false,
            error: "User not found",
            },
            {
            status: 403,
            headers: corsHeaders,
            }
        );
        }

        const workspace = await resolveWorkspaceContext(
        env,
        profile
        );

        const access = await getEffectiveAccess(
        env,
        workspace,
        app
        );

        return Response.json(
        {
            ok: true,
            app: access.app,
            actorType: access.actorType,
            actorUserId: access.actorUserId,
            workspaceUserId: access.workspaceUserId,
            role: access.role,
            permissions: access.permissions,
        },
        {
            status: 200,
            headers: corsHeaders,
        }
        );
    } catch (error) {
        console.error(
        "[company-access-context]",
        error
        );

        return Response.json(
        {
            ok: false,
            error:
            error?.message ||
            "Unable to resolve company access",
            code: error?.code || "access_context_failed",
        },
        {
            status: error?.status || 500,
            headers: corsHeaders,
        }
        );
    }
    }

    if (
    url.pathname === "/api/company/access-control"
    ) {
    try {
        const token = getTokenFromRequest(request);

        if (!token) {
        return Response.json(
            {
            ok: false,
            error: "Unauthorized",
            },
            {
            status: 401,
            headers: corsHeaders,
            }
        );
        }

        const decoded = decodeAndValidateToken(token);

        if (!decoded.ok) {
        return Response.json(
            {
            ok: false,
            error: decoded.error || "Unauthorized",
            },
            {
            status: 401,
            headers: {
                ...(decoded.error === "expired"
                ? { "Set-Cookie": buildClearCookie() }
                : {}),
                ...corsHeaders,
            },
            }
        );
        }

        const profile = await getProfileByEmail(
        env,
        decoded.email
        );

        if (!profile) {
        return Response.json(
            {
            ok: false,
            error: "User not found",
            },
            {
            status: 403,
            headers: corsHeaders,
            }
        );
        }

        const workspace = await resolveWorkspaceContext(
        env,
        profile
        );

        const app =
        url.searchParams.get("app") || "appointment";

        if (request.method === "GET") {
        const matrix = await getCompanyAccessMatrix(
            env,
            workspace,
            app
        );

        return Response.json(
            {
            ok: true,
            ...matrix,
            },
            {
            status: 200,
            headers: corsHeaders,
            }
        );
        }

        if (request.method === "PUT") {
        let body;

        try {
            body = await request.json();
        } catch {
            return Response.json(
            {
                ok: false,
                error: "Invalid JSON body",
            },
            {
                status: 400,
                headers: corsHeaders,
            }
            );
        }

        const result =
            await saveCompanyRolePermissions(
            env,
            workspace,
            app,
            body?.role,
            body?.permissions
            );

        return Response.json(
            {
            ok: true,
            access: result,
            },
            {
            status: 200,
            headers: corsHeaders,
            }
        );
        }

        return Response.json(
        {
            ok: false,
            error: "Method Not Allowed",
        },
        {
            status: 405,
            headers: {
            Allow: "GET, PUT, OPTIONS",
            ...corsHeaders,
            },
        }
        );
    } catch (error) {
        console.error(
        "[company-access-control]",
        error
        );

        return Response.json(
        {
            ok: false,
            error:
            error?.message ||
            "Unable to manage company access",
            code: error?.code || "access_control_failed",
        },
        {
            status: error?.status || 500,
            headers: corsHeaders,
        }
        );
    }
    }
    /* ==============================
      ✅ COMPANY INVITATIONS
      POST /api/company-invitations
      body: { action: 'list' | 'create' | 'get' | 'accept',  'update-role' |
    'remove-member',...params }
      Auth: Authorization: Bearer <app JWT> (signHS256 w/ APP_JWT_SECRET),
      same token/flow as /api/odoo/login + /api/odoo/rpc + /api/odoo/me.
      "get" is public (token possession is the credential); everything
      else requires a valid app JWT.
============================== */
if (url.pathname === "/api/company-invitations") {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ ok: false, message: "Invalid JSON body" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
    const { action } = body || {};

    try {
        // "get" (view an invite by token) stays public — the invitation
        // token itself is the credential, no app session needed.
        if (action === "get") {
            const invitation = await getCompanyInvitation(env, body.token);
            return new Response(JSON.stringify({ ok: true, invitation }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
        // Public: the newly created subuser does not have
        // an mrbur_sso login session yet.
        if (action === "accept") {
            await acceptCompanyInvitation(
                env,
                body.token
            );

            return new Response(
                JSON.stringify({
                    ok: true,
                    message:
                        "Your company member account has been activated."
                }),
                {
                    status: 200,
                    headers: {
                        "Content-Type": "application/json",
                        ...corsHeaders
                    }
                }
            );
        }
        // Everything else requires the mrbur_sso cookie, same
        // getTokenFromRequest/decodeAndValidateToken/getProfileByEmail
        // pattern as /api/dental/chart and /api/inventory/meta.
        const token = getTokenFromRequest(request);
        if (!token) {
            return new Response(JSON.stringify({ ok: false, message: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        const decoded = decodeAndValidateToken(token);
        if (!decoded.ok) {
            return new Response(JSON.stringify({ ok: false, message: decoded.error || "Unauthorized" }), {
                status: 401,
                headers: {
                    "Content-Type": "application/json",
                    ...(decoded.error === "expired" ? { "Set-Cookie": buildClearCookie() } : {}),
                    ...corsHeaders,
                },
            });
        }

        let profile;
        try {
            profile = await getProfileByEmail(env, decoded.email);
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, message: e.message }), {
                status: 500,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
        if (!profile) {
            return new Response(JSON.stringify({ ok: false, message: "User not found" }), {
                status: 403,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

if (profile.account_type !== "company") {
  return new Response(
    JSON.stringify({
      ok: false,
      message: "Only the company owner can manage company members.",
    }),
    {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}
const companyOwnerUserId = profile.user_id;
if (!companyOwnerUserId) {
    return new Response(JSON.stringify({ ok: false, message: "Missing company context" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
    });
}
if (action === "search-individuals") {
  const profiles = await searchIndividualProfiles(
    env,
    companyOwnerUserId,
    body.query
  );

  return new Response(
    JSON.stringify({
      ok: true,
      profiles,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

if (action === "add-existing-member") {
  const member = await addExistingCompanyMember(
    env,
    companyOwnerUserId,
    body.memberUserId,
    String(body.role || "").toLowerCase()
  );

  return new Response(
    JSON.stringify({
      ok: true,
      member,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

if (action === "list") {
    const { members, invitations } = await listCompanyPeople(env, companyOwnerUserId);
    return new Response(JSON.stringify({ ok: true, members, invitations }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
    });
}
if (action === "update-role") {
  const member = await updateCompanyMemberRole(
    env,
    companyOwnerUserId,
    body.memberUserId,
    body.role
  );

  return new Response(
    JSON.stringify({ ok: true, member }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

if (action === "remove-member") {
  // 1. Remove the active company membership.
  // 2. Change the profile back to individual.
  // 3. Remove access to the owner's appointment clinic.
  const member = await removeCompanyMember(
    env,
    companyOwnerUserId,
    body.memberUserId
  );

  /*
   * Run the same bootstrap used by GET /api/bootstrap.
   *
   * This should:
   * - create or recover the user's individual clinic;
   * - set profiles.clinic_id to the individual clinic ID;
   * - create/update apt_clinic_members with that clinic ID;
   * - create/recover the user's individual inventory metadata.
   */
  let individualProfile = null;
  let bootstrapWarning = null;

  try {
    individualProfile = await supabaseBootstrapByEmail(
      env,
      member.email
    );
  } catch (bootstrapError) {
    /*
     * The member removal itself has already succeeded.
     *
     * Do not return a complete failure because retrying remove-member
     * would then say the active company membership no longer exists.
     * GET /api/bootstrap will retry provisioning on the user's next login.
     */
    console.error(
      "[company-invitations] Individual bootstrap failed after removal:",
      bootstrapError
    );

    bootstrapWarning =
      "The member was removed, but their individual workspace will finish provisioning when they next sign in.";
  }

  return new Response(
    JSON.stringify({
      ok: true,
      member,
      individualProfile,
      warning: bootstrapWarning,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    }
  );
}

if (action === "create") {
    const cookieHeader =
        request.headers.get("Cookie") || "";

    const { inviteUrl, companyName } =
    await createCompanyInvitation(
        env,
        companyOwnerUserId,
        body.email,
        body.role,
        cookieHeader
    );
    
    return new Response(JSON.stringify({ ok: true, inviteUrl, companyName }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
    });
}
    } catch (error) {
        console.error(
                "[company-invitations]",
                error
            );

        return new Response(
            JSON.stringify({
                ok: false,
                message:
                    error?.message ||
                    "Unable to activate the company member account."
            }),
            {
                status: 400,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders
                }
            }
        );
    }
}

    if (url.hostname === 'e-learning.snabbb.com' && url.pathname === '/api/shop-redirect' && request.method === 'POST') {
    let body = {}
    try {
        body = await request.json()
    } catch {
        return new Response(JSON.stringify({ error: 'invalid body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
    }

    const returnUrl = body.return_url
    if (!returnUrl) {
        return new Response(JSON.stringify({ error: 'missing return_url' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
    }

    const parsed = new URL(returnUrl)
    const next = parsed.pathname + parsed.search

    // ── 1. Try existing .snabbb.com Odoo session ──────────────────────────────
    const cookies = request.headers.get('Cookie') || ''
    const sessionId = cookies.split(';')
        .map(s => s.trim())
        .find(p => p.startsWith('session_id='))
        ?.slice('session_id='.length)

    if (sessionId) {
    const CF_COUNTRY_SUBDOMAIN = {
    'Malaysia': 'my', 'Singapore': 'sg', 'Thailand': 'th',
    'Indonesia': 'id', 'United States': 'us', 'United Kingdom': 'uk',
    'Australia': 'au', 'Vietnam': 'vn', 'Philippines': 'ph',
    'South Korea': 'kr', 'Japan': 'jp', 'Canada': 'ca',
    'United Arab Emirates': 'ae', 'Saudi Arabia': 'sa', 'New Zealand': 'nz',
}

    let shopSubdomain = 'www'
    try {
        // Step 1: get uid from session
        const sessionRes = await fetch('https://mrbur.odoo.com/web/session/get_session_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': `session_id=${sessionId}` },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: {} }),
        })
        const sessionData = await sessionRes.json().catch(() => null)
        const uid = sessionData?.result?.uid

        if (uid) {
            // Step 2: read country_id from res.users (inherits from res.partner)
            const userRes = await fetch('https://mrbur.odoo.com/web/dataset/call_kw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': `session_id=${sessionId}` },
                body: JSON.stringify({
                    jsonrpc: '2.0', method: 'call',
                    params: {
                        model: 'res.users', method: 'read',
                        args: [[uid]], kwargs: { fields: ['country_id'] },
                    },
                }),
            })
            const userData = await userRes.json().catch(() => null)
            const countryName = userData?.result?.[0]?.country_id?.[1]  // e.g. "Thailand"
            console.log('odoo country:', countryName)
            shopSubdomain = CF_COUNTRY_SUBDOMAIN[countryName] || 'www'
        }
    } catch (e) {
        console.error('country lookup failed:', e)
    }

    const plantUrl = new URL(`https://${shopSubdomain}.mrbur.shop/sso/plant-cookie`)
    plantUrl.searchParams.set('sid', sessionId)
    plantUrl.searchParams.set('next', next)
    return new Response(JSON.stringify({ redirect_url: plantUrl.toString() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
}

    // ── 2. Fallback: Supabase JWT → app_link → odoo-exchange ─────────────────
    const authHeader = request.headers.get('Authorization') || ''
    const supaToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    let email = '', name = 'User'
    if (supaToken) {
        try {
            const parts = supaToken.split('.')
            if (parts.length === 3) {
                const pad = parts[1].length % 4
                const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/') + (pad ? '==='.slice(pad - 1) : '')
                const payload = JSON.parse(atob(b64))
                email = payload.email || ''
                name = payload.user_metadata?.full_name || payload.user_metadata?.name || email.split('@')[0] || 'User'
            }
        } catch {}
    }

    if (email) {
        const apiKey = env.ODOO_SSO_API_KEY || env.SSO_API_KEY || ''
        try {
            const appLinkRes = await fetch('https://mrbur.odoo.com/api/v1/sso/app_link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-SSO-API-KEY': apiKey },
                body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { app_code: 'shop', email, name } }),
            })
            const result = (await appLinkRes.json().catch(() => null))?.result
            if (result?.ok && result?.url) {
                const ssoUrl = new URL(result.url)
                const token = ssoUrl.searchParams.get('token')
                const companyCode = ssoUrl.searchParams.get('company_code') || 'INT'
                if (token) {
                    const exchangeUrl = new URL('https://app.snabbb.com/api/sso/odoo-exchange')
                    exchangeUrl.searchParams.set('token', token)
                    exchangeUrl.searchParams.set('company_code', companyCode)
                    exchangeUrl.searchParams.set('next', next)
                    return new Response(JSON.stringify({ redirect_url: exchangeUrl.toString() }), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    })
                }
            }
        } catch {}
    }

    // ── 3. Last resort: direct unauthenticated link ───────────────────────────
    return new Response(JSON.stringify({ redirect_url: returnUrl }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
}

    if (TICKETING_HOSTS.has(url.hostname) && url.pathname === '/api/ticketing/sso' && request.method === 'POST') {
  const origin = request.headers.get('Origin') || `https://${url.hostname}`;

  const COMPANY_SUBDOMAIN_MAP = {
    MMY: 'my', MSG: 'sg', MTH: 'th', MIN: 'id',
    MUSA: 'us', MUK: 'uk', MAU: 'au', MVN: 'vn',
    MPH: 'ph', MKR: 'kr', MCA: 'ca', MAE: 'ae',
    MSA: 'sa', MNZ: 'nz', MEU: 'eu',
  };

  let subdomain = 'my'; // fallback if lookup fails or company_code is unmapped

  try {
    const sessionInfoRes = await fetch( 'https://app.snabbb.com/api/odoo/session_info',
    {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Cookie: request.headers.get('Cookie') || '',
            },
        },
    );
    const sessionInfoJson = await sessionInfoRes.json().catch(() => null);

    if (sessionInfoRes.ok && sessionInfoJson?.ok && sessionInfoJson?.company_code) {
      const companyCode = String(sessionInfoJson.company_code).trim().toUpperCase();
      subdomain = COMPANY_SUBDOMAIN_MAP[companyCode] || subdomain;
    }
  } catch (e) {
    console.log('[ticketing/sso] session_info lookup failed:', e?.message || String(e));
  }

  const redirectUrl = `https://${subdomain}.mrbur.shop/my/tickets`;

  return new Response(
    JSON.stringify({
        redirectUrl,
    }),
    {
        status: 200,
        headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
            'Content-Type, Authorization, Accept, X-Requested-With, X-SSO-API-KEY',
        Vary: 'Origin',
        },
    },
    );
}

// Handle the preflight the browser sends before the POST
if (
  TICKETING_HOSTS.has(url.hostname) &&
  url.pathname === '/api/ticketing/sso' &&
  request.method === 'OPTIONS'
) {
  const origin = request.headers.get('Origin') || '';

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, Accept, X-Requested-With, X-SSO-API-KEY',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  });
}

        // Ticketing Gmail bridge. New inbound Gmail messages are synchronized
        // by scheduled(), while authenticated admins use this route to reply.
        if (url.pathname === '/api/ticketing/gmail/reply') {
            return await handleTicketingGmailReply(request, env);
        }

        // Optional protected endpoint for a manual synchronization test.
        if (url.pathname === '/api/ticketing/gmail/sync') {
            return await handleTicketingGmailSync(request, env);
        }


        return new Response("SSO Gateways Active", {
            status: 200,
            headers: corsHeaders,
        });
    },

    async scheduled(controller, env, ctx) {
        console.log('[ticketing-gmail] scheduled sync started', {
            cron: controller?.cron || 'unknown',
            scheduledTime: controller?.scheduledTime || null,
        });
        ctx.waitUntil(
            syncTicketingGmailInbox(env)
                .then((result) => {
                    console.log('[ticketing-gmail] scheduled sync completed', result);
                })
                .catch((error) => {
                    console.error('[ticketing-gmail] scheduled sync failed', error?.stack || error?.message || String(error));
                    throw error;
                })
        );
    },
};

// Synchronize only the admin role that is managed by Odoo's Internal User
// group. Existing non-Odoo admins and ordinary account types are untouched.
async function syncOdooInternalAdminStatus(env, userId, isInternalUserClaim) {
    // Older Odoo tokens do not contain this signed claim. Treat that as
    // unknown instead of accidentally granting or revoking admin access.
    if (typeof isInternalUserClaim !== "boolean") {
        console.log("[odoo-admin-sync] skipped: missing is_internal_user claim", { userId });
        return;
    }

    const supabaseBase = String(env.SUPABASE_URL || "").replace(/\/$/, "");
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseBase || !serviceKey || !userId) {
        throw new Error("odoo_admin_sync_not_configured");
    }

    const headers = {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
    const profileUrl =
        `${supabaseBase}/rest/v1/profiles` +
        `?user_id=eq.${encodeURIComponent(userId)}` +
        "&select=user_id,account_type,odoo_admin_previous_account_type,is_odoo_internal_admin" +
        "&limit=1";

    const profileResponse = await fetch(profileUrl, { headers });
    const profiles = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok) {
        throw new Error(`odoo_admin_profile_read_failed:${profileResponse.status}`);
    }

    const profile = Array.isArray(profiles) ? profiles[0] : null;
    if (!profile) {
        throw new Error("odoo_admin_profile_missing");
    }

    const updateProfile = async (changes) => {
        const updateResponse = await fetch(
            `${supabaseBase}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}`,
            {
                method: "PATCH",
                headers: { ...headers, Prefer: "return=minimal" },
                body: JSON.stringify(changes),
            }
        );

        if (!updateResponse.ok) {
            throw new Error(`odoo_admin_profile_update_failed:${updateResponse.status}`);
        }
    };

    if (isInternalUserClaim) {
        if (profile.account_type !== "admin") {
            if (!profile.account_type) {
                throw new Error("odoo_admin_previous_account_type_missing");
            }

            await updateProfile({
                odoo_admin_previous_account_type: profile.account_type,
                account_type: "admin",
                is_odoo_internal_admin: true,
            });
            console.log("[odoo-admin-sync] promoted", { userId });
        }

        // account_type=admin with a false marker is an existing/manual admin.
        // Its previous type is unknowable, so this login flow must not claim
        // ownership of it or later downgrade it.
        return;
    }

    if (profile.is_odoo_internal_admin === true) {
        const previousType = profile.odoo_admin_previous_account_type;
        if (!previousType || previousType === "admin") {
            throw new Error("odoo_admin_restore_type_invalid");
        }

        await updateProfile({
            account_type: previousType,
            odoo_admin_previous_account_type: null,
            is_odoo_internal_admin: false,
        });
        console.log("[odoo-admin-sync] revoked and restored", { userId });
    }
}

/* ===================== Supabase ticketing Gmail ===================== */
const TICKETING_GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

function requireTicketingEnv(env, name) {
    const value = String(env[name] || '').trim();
    if (!value) throw new Error(`ticketing_gmail_missing_${name.toLowerCase()}`);
    return value;
}

function ticketingJson(body, status = 200, origin = '') {
    const allowedOrigins = new Set(['https://app.snabbb.com', 'http://localhost:3000', 'http://localhost:5173']);
    const allowOrigin = allowedOrigins.has(origin) ? origin : 'https://app.snabbb.com';
    return new Response(status === 204 ? null : JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': allowOrigin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Ticketing-Cron-Secret',
            Vary: 'Origin',
        },
    });
}

function ticketingServiceHeaders(env, extra = {}) {
    const key = requireTicketingEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
    return {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...extra,
    };
}

async function ticketingSupabase(env, path, init = {}) {
    const base = requireTicketingEnv(env, 'SUPABASE_URL').replace(/\/$/, '');
    const response = await fetch(`${base}/rest/v1/${path}`, {
        ...init,
        headers: ticketingServiceHeaders(env, init.headers || {}),
    });
    const text = await response.text();
    let data = null;
    if (text) {
        try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!response.ok) {
        const detail = data?.message || data?.error || String(data || response.statusText);
        throw new Error(`ticketing_supabase_${response.status}:${detail}`);
    }
    return data;
}

function ticketingFromBase64UrlBytes(value = '') {
    const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(normalized);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function ticketingFromBase64UrlText(value = '') {
    return new TextDecoder().decode(ticketingFromBase64UrlBytes(value));
}

function ticketingToBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ticketingGmailHeaders(payload) {
    return Object.fromEntries((payload?.headers || []).map((item) => [String(item.name || '').toLowerCase(), String(item.value || '')]));
}

function ticketingHeaderAddresses(value) {
    const addresses = [];
    for (const part of String(value || '').split(',')) {
        const angleAddress = part.match(/<\s*([^<>\s]+@[^<>\s]+)\s*>/);
        const plainAddress = part.match(/(?:^|\s)([^<>\s,;]+@[^<>\s,;]+)(?:$|\s)/);
        const address = (angleAddress?.[1] || plainAddress?.[1] || '')
            .trim()
            .toLowerCase();
        if (address) addresses.push(address);
    }
    return addresses;
}

function ticketingWasAddressedTo(payload, recipient) {
    const headerMap = ticketingGmailHeaders(payload);
    const expected = String(recipient || '').trim().toLowerCase();
    return ticketingHeaderAddresses(headerMap.to).includes(expected);
}

function ticketingParseAddress(value) {
    const match = String(value || '').match(/^\s*(?:"?([^"<]*)"?\s*)?<([^>]+)>\s*$/);
    if (match) return { name: match[1]?.trim() || match[2].trim(), email: match[2].trim().toLowerCase() };
    const email = String(value || '').trim().replace(/^mailto:/i, '').toLowerCase();
    return { name: email, email };
}

function ticketingMessageText(payload) {
    const plain = [];
    const html = [];
    const visit = (part) => {
        if (!part) return;
        const body = part.body?.data ? ticketingFromBase64UrlText(part.body.data) : '';
        if (body && part.mimeType === 'text/plain') plain.push(body);
        if (body && part.mimeType === 'text/html') html.push(body.replace(/<[^>]*>/g, ' '));
        for (const child of part.parts || []) visit(child);
    };
    visit(payload);
    return (plain.length ? plain.join('\n\n') : html.join('\n\n')).replace(/\s+\n/g, '\n').trim();
}

function ticketingAttachmentParts(payload) {
    const result = [];
    const visit = (part) => {
        if (!part) return;
        if (part.filename && (part.body?.attachmentId || part.body?.data)) result.push(part);
        for (const child of part.parts || []) visit(child);
    };
    visit(payload);
    return result;
}

async function ticketingGmailAccessToken(env) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: requireTicketingEnv(env, 'GMAIL_CLIENT_ID'),
            client_secret: requireTicketingEnv(env, 'GMAIL_CLIENT_SECRET'),
            refresh_token: requireTicketingEnv(env, 'GMAIL_REFRESH_TOKEN'),
            grant_type: 'refresh_token',
        }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || 'ticketing_gmail_token_refresh_failed');
    return String(data.access_token);
}

async function ticketingGmailRequest(token, path, init = {}) {
    const response = await fetch(`${TICKETING_GMAIL_BASE}${path}`, {
        ...init,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `ticketing_gmail_api_${response.status}`);
    return data;
}

async function ticketingFindProfileUserId(env, email) {
    const rows = await ticketingSupabase(env, `profiles?email=ilike.${encodeURIComponent(email)}&select=user_id&limit=1`);
    return Array.isArray(rows) && rows[0]?.user_id ? rows[0].user_id : null;
}

async function ticketingImportGmailAttachments(env, token, gmailMessage, ticketId, messageId) {
    let totalBytes = 0;
    for (const part of ticketingAttachmentParts(gmailMessage.payload)) {
        let encoded = part.body?.data || '';
        if (part.body?.attachmentId) {
            const fetched = await ticketingGmailRequest(token, `/messages/${encodeURIComponent(gmailMessage.id)}/attachments/${encodeURIComponent(part.body.attachmentId)}`);
            encoded = fetched.data || '';
        }
        const bytes = ticketingFromBase64UrlBytes(encoded);
        totalBytes += bytes.byteLength;
        if (bytes.byteLength > 10 * 1024 * 1024 || totalBytes > 25 * 1024 * 1024) throw new Error('ticketing_gmail_attachments_too_large');

        const originalName = String(part.filename || 'attachment').slice(0, 255);
        const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${ticketId}/gmail/${crypto.randomUUID()}-${safeName}`;
        const supabaseBase = requireTicketingEnv(env, 'SUPABASE_URL').replace(/\/$/, '');
        const serviceKey = requireTicketingEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');
        const upload = await fetch(`${supabaseBase}/storage/v1/object/ticket-attachments/${storagePath.split('/').map(encodeURIComponent).join('/')}`, {
            method: 'POST',
            headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': part.mimeType || 'application/octet-stream', 'x-upsert': 'false' },
            body: bytes,
        });
        if (!upload.ok) throw new Error(`ticketing_attachment_upload_${upload.status}:${await upload.text()}`);

        await ticketingSupabase(env, 'support_ticket_attachments', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ ticket_id: ticketId, message_id: messageId, uploaded_by: null, storage_path: storagePath, file_name: originalName, mime_type: part.mimeType || null, file_size: bytes.byteLength }),
        });
    }
}

async function ticketingProcessIncomingMessage(env, token, message, mailbox, ticketAddress, requiredLabelId) {
    if (!message?.id) return false;
    // A Gmail search is only a first-pass filter. Verify the label and the
    // original To header again before doing any database work so aliases,
    // forwarding headers, and stale thread labels cannot create tickets.
    if (!message.labelIds?.includes(requiredLabelId)) return false;
    if (!ticketingWasAddressedTo(message.payload, ticketAddress)) return false;

    const messageDuplicates = await ticketingSupabase(env, `support_ticket_messages?gmail_message_id=eq.${encodeURIComponent(message.id)}&select=id&limit=1`);
    const ticketDuplicates = await ticketingSupabase(env, `support_tickets?initial_gmail_message_id=eq.${encodeURIComponent(message.id)}&select=id&limit=1`);
    if (messageDuplicates?.length || ticketDuplicates?.length) return false;

    const headerMap = ticketingGmailHeaders(message.payload);
    const sender = ticketingParseAddress(headerMap.from || '');
    if (!sender.email || sender.email === mailbox.toLowerCase() || sender.email === ticketAddress.toLowerCase()) return false;
    const body = ticketingMessageText(message.payload) || message.snippet || 'Email message has no text body.';
    const createdBy = await ticketingFindProfileUserId(env, sender.email);
    const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString();
    const existing = message.threadId
        ? await ticketingSupabase(env, `support_tickets?gmail_thread_id=eq.${encodeURIComponent(message.threadId)}&select=*&limit=1`)
        : [];

    if (existing?.[0]) {
        const ticket = existing[0];
        const inserted = await ticketingSupabase(env, 'support_ticket_messages', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ ticket_id: ticket.id, author_id: createdBy, author_name: sender.name, author_email: sender.email, body, is_internal: false, direction: 'incoming', source: 'gmail', gmail_message_id: message.id, gmail_thread_id: message.threadId || null, rfc_message_id: headerMap['message-id'] || null, delivery_status: 'received', gmail_received_at: receivedAt }),
        });
        await ticketingImportGmailAttachments(env, token, message, ticket.id, inserted?.[0]?.id || null);
    } else {
        const inserted = await ticketingSupabase(env, 'support_tickets', {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ created_by: createdBy, requester_name: sender.name, requester_email: sender.email, recipient_email: ticketAddress, subject: headerMap.subject || 'Email support request', description: body, category: null, priority: '1', status: 'request', source: 'email', gmail_thread_id: message.threadId || null, initial_gmail_message_id: message.id, last_gmail_message_id: message.id, created_at: receivedAt, last_activity_at: receivedAt }),
        });
        if (!inserted?.[0]?.id) throw new Error('ticketing_ticket_insert_returned_no_id');
        await ticketingImportGmailAttachments(env, token, message, inserted[0].id, null);
    }
    return true;
}

async function syncTicketingGmailInbox(env) {
    const mailbox = requireTicketingEnv(env, 'GMAIL_SUPPORT_EMAIL').toLowerCase();
    const ticketAddress = 'support@snabbb.com';
    const requiredLabelName = String(env.GMAIL_TICKETING_LABEL || 'customer-inquiries').trim();
    const states = await ticketingSupabase(env, `support_gmail_sync_state?mailbox_email=eq.${encodeURIComponent(mailbox)}&select=*&limit=1`);
    const state = states?.[0];
    const now = new Date().toISOString();

    if (!state) {
        await ticketingSupabase(env, 'support_gmail_sync_state', {
            method: 'POST',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ mailbox_email: mailbox, last_sync_at: now, last_success_at: now }),
        });
        return { initialized: true, processed: 0, message: 'Checkpoint created. Only email received after this point will be imported.' };
    }

    const token = await ticketingGmailAccessToken(env);
    const labelResponse = await ticketingGmailRequest(token, '/labels');
    const requiredLabel = (labelResponse.labels || []).find(
        (label) => String(label.name || '').trim().toLowerCase() === requiredLabelName.toLowerCase()
    );
    if (!requiredLabel?.id) throw new Error(`ticketing_gmail_label_not_found:${requiredLabelName}`);

    // Advance the checkpoint to the start of this run so mail received during
    // processing is picked up on the next run instead of falling into a gap.
    const syncStartedAt = new Date();
    const cutoffSource = state.last_success_at || state.created_at;
    const cutoff = Math.floor(new Date(cutoffSource).getTime() / 1000);
    let processed = 0;

    try {
        const query = encodeURIComponent(`after:${cutoff} to:${ticketAddress}`);
        const listing = await ticketingGmailRequest(
            token,
            `/messages?labelIds=${encodeURIComponent(requiredLabel.id)}&maxResults=100&q=${query}`
        );
        for (const item of [...(listing.messages || [])].reverse()) {
            const message = await ticketingGmailRequest(token, `/messages/${encodeURIComponent(item.id)}?format=full`);
            processed += Number(await ticketingProcessIncomingMessage(
                env,
                token,
                message,
                mailbox,
                ticketAddress,
                requiredLabel.id
            ));
        }
        await ticketingSupabase(env, `support_gmail_sync_state?mailbox_email=eq.${encodeURIComponent(mailbox)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_success_at: syncStartedAt.toISOString(), last_error: null }),
        });
        return { initialized: false, processed };
    } catch (error) {
        await ticketingSupabase(env, `support_gmail_sync_state?mailbox_email=eq.${encodeURIComponent(mailbox)}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ last_sync_at: new Date().toISOString(), last_error_at: new Date().toISOString(), last_error: error?.message || String(error) }),
        }).catch(() => {});
        throw error;
    }
}

async function ticketingAuthenticatedUser(env, request) {
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.startsWith('Bearer ')) return null;
    const base = requireTicketingEnv(env, 'SUPABASE_URL').replace(/\/$/, '');
    const anonKey = requireTicketingEnv(env, 'SUPABASE_ANON_KEY');
    const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authorization } });
    if (!response.ok) return null;
    const user = await response.json().catch(() => null);
    return user?.id ? user : null;
}

async function ticketingSendGmailReply(env, userId, ticketId, body) {
    const profiles = await ticketingSupabase(env, `profiles?user_id=eq.${encodeURIComponent(userId)}&select=account_type,name,full_name,email&limit=1`);
    if (profiles?.[0]?.account_type !== 'admin') throw new Error('Admin access required.');
    const adminProfile = profiles[0];
    const tickets = await ticketingSupabase(env, `support_tickets?id=eq.${encodeURIComponent(ticketId)}&select=*&limit=1`);
    const ticket = tickets?.[0];
    if (!ticket) throw new Error('Ticket not found.');
    if (ticket.status === 'done' || ticket.status === 'expired') throw new Error('This ticket is closed and can no longer receive replies.');
    if (!ticket.gmail_thread_id) throw new Error('This ticket did not originate from Gmail.');
    if (!ticket.requester_email) throw new Error('This Gmail ticket has no requester email.');

    const token = await ticketingGmailAccessToken(env);
    const mailbox = requireTicketingEnv(env, 'GMAIL_SUPPORT_EMAIL');
    const subject = /^re:/i.test(ticket.subject) ? ticket.subject : `Re: ${ticket.subject}`;
    const ticketUrl = 'https://app.snabbb.com';
    const ticketNumber = `ST-${String(ticket.ticket_no).padStart(6, '0')}`;
    const textNotice = [
        `Snabbb Support has replied to your request ${ticketNumber}.`,
        '',
        'For your privacy, the reply is available in App.Snabbb.',
        'Sign in to view the response and continue the conversation:',
        '',
        ticketUrl,
        '',
        'Thank you,',
        'Snabbb Support',
    ].join('\r\n');
    const htmlNotice = `<!doctype html><html><body style="margin:0;background:#f4f7f8;font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #dfe8ea;border-radius:18px;overflow:hidden"><div style="height:6px;background:#0a9f9b"></div><div style="padding:32px"><div style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#0a7a78;text-transform:uppercase">${ticketNumber}</div><h1 style="margin:14px 0 12px;font-size:24px;line-height:1.3">Admin has replied to your request</h1><p style="margin:0 0 22px;color:#5d6878;font-size:15px;line-height:1.7">For your privacy, please sign in to App.Snabbb to view the response and continue the conversation.</p><a href="${ticketUrl}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:#0a9f9b;color:#fff;text-decoration:none;font-size:14px;font-weight:700">View reply in App.Snabbb</a><p style="margin:24px 0 0;color:#8993a2;font-size:12px;line-height:1.6">If the button does not work, copy this link:<br><a href="${ticketUrl}" style="color:#0a7a78">${ticketUrl}</a></p></div></div></body></html>`;
    const boundary = `snabbb_notice_${crypto.randomUUID().replace(/-/g, '')}`;
    const raw = [
        `From: ${mailbox}`,
        `To: ${ticket.requester_email}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        textNotice,
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        htmlNotice,
        `--${boundary}--`,
        '',
    ].join('\r\n');
    const sent = await ticketingGmailRequest(token, '/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: ticketingToBase64Url(raw), threadId: ticket.gmail_thread_id }),
    });
    const inserted = await ticketingSupabase(env, 'support_ticket_messages', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ ticket_id: ticket.id, author_id: userId, author_name: adminProfile.full_name || adminProfile.name || adminProfile.email || 'Snabbb Support', author_email: adminProfile.email || null, body, is_internal: false, direction: 'outgoing', source: 'gmail', gmail_message_id: sent.id, gmail_thread_id: sent.threadId, delivery_status: 'sent' }),
    });
    return inserted?.[0];
}

async function handleTicketingGmailReply(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return ticketingJson({ ok: true }, 204, origin);
    if (request.method !== 'POST') return ticketingJson({ ok: false, message: 'Method not allowed.' }, 405, origin);
    try {
        const user = await ticketingAuthenticatedUser(env, request);
        if (!user) return ticketingJson({ ok: false, message: 'Authentication required.' }, 401, origin);
        const input = await request.json().catch(() => ({}));
        const ticketId = String(input.ticket_id || '');
        const body = String(input.body || '').trim();
        if (!ticketId || !body || body.length > 20000) return ticketingJson({ ok: false, message: 'A valid ticket and reply are required.' }, 400, origin);
        const message = await ticketingSendGmailReply(env, user.id, ticketId, body);
        return ticketingJson({ ok: true, message }, 200, origin);
    } catch (error) {
        console.error('[ticketing-gmail] reply failed', error?.message || String(error));
        const status = error?.message === 'Admin access required.' ? 403 : 500;
        return ticketingJson({ ok: false, message: error?.message || 'Unable to send Gmail reply.' }, status, origin);
    }
}

async function handleTicketingGmailSync(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return ticketingJson({ ok: true }, 204, origin);
    if (request.method !== 'POST') return ticketingJson({ ok: false, message: 'Method not allowed.' }, 405, origin);
    if (request.headers.get('X-Ticketing-Cron-Secret') !== requireTicketingEnv(env, 'TICKETING_GMAIL_CRON_SECRET')) {
        return ticketingJson({ ok: false, message: 'Unauthorized.' }, 401, origin);
    }
    try {
        return ticketingJson({ ok: true, ...(await syncTicketingGmailInbox(env)) }, 200, origin);
    } catch (error) {
        console.error('[ticketing-gmail] manual sync failed', error?.message || String(error));
        return ticketingJson({ ok: false, message: error?.message || 'Unable to synchronize Gmail.' }, 500, origin);
    }
}
