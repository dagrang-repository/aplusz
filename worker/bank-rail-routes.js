      /* ---- bank/link rail: buy + admin confirm ---- */
      if (url.pathname === '/buy' && req.method === 'POST') {
        return handleCheckout(env, req, origin);
      }
      if (url.pathname === '/admin/pending' && req.method === 'GET') {
        return handleAdminPending(env, req, origin, url);
      }
      if (url.pathname === '/admin/markpaid' && req.method === 'POST') {
        return handleAdminMarkpaid(env, req, origin);
      }

