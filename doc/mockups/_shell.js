/* Injects the shared top nav + sidebar into #topnav and #sidebar.
   Active item is set from <body data-page="..."> . Nav links defined once here. */
(function () {
  var CLIENT = { ini: 'KS', name: 'Khukri Spices', grad: 'linear-gradient(145deg,#27B98A,#149068)' };
  var NAV = [
    { sec: 'Agency' },
    { k: 'overview', l: 'Overview', i: 'layout-dashboard', h: 'agency_dashboard.html' },
    { k: 'clients', l: 'All clients', i: 'users-group', h: 'clients_list.html', c: '8' },
    { sec: CLIENT.name },
    { k: 'domain', l: 'Sending domain', i: 'world-check', h: 'domain.html' },
    { k: 'contacts', l: 'Contacts', i: 'address-book', h: 'contacts.html' },
    { k: 'templates', l: 'Templates', i: 'template', h: 'templates.html' },
    { k: 'campaigns', l: 'Campaigns', i: 'send', h: 'campaigns_list.html' },
    { k: 'flows', l: 'Flows', i: 'route', h: 'flows.html' },
    { k: 'forms', l: 'Forms', i: 'forms', h: 'forms.html' },
    { k: 'reports', l: 'Reports', i: 'chart-bar', h: 'reports.html' },
    { sec: 'Settings' },
    { k: 'team', l: 'Team', i: 'users', h: 'team.html' },
    { k: 'integrations', l: 'Integrations', i: 'plug', h: 'integrations.html' },
    { k: 'billing', l: 'Billing', i: 'credit-card', h: 'billing.html' },
    { k: 'whitelabel', l: 'White-label', i: 'palette', h: 'whitelabel.html' }
  ];

  var page = document.body.dataset.page || '';

  var tn = document.getElementById('topnav');
  if (tn) {
    tn.outerHTML =
      '<div class="topnav">' +
        '<div class="tn-left">' +
          '<div class="brand"><span class="mark">S</span> SendMyMail <span class="sep">/</span> <span class="agency">Nirvana Agency</span></div>' +
          '<div class="switcher"><span class="av av-sm" style="background:' + CLIENT.grad + ';">' + CLIENT.ini + '</span> ' + CLIENT.name + ' <i class="ti ti-selector chev"></i></div>' +
        '</div>' +
        '<div class="tn-right">' +
          '<button class="icon-btn"><i class="ti ti-search"></i></button>' +
          '<button class="icon-btn"><i class="ti ti-bell"></i></button>' +
          '<button class="btn btn-primary" onclick="location.href=\'campaign_new.html\'"><i class="ti ti-plus"></i> New campaign</button>' +
          '<div class="me">PG</div>' +
        '</div>' +
      '</div>';
  }

  var sb = document.getElementById('sidebar');
  if (sb) {
    sb.className = 'sidebar';
    var items = NAV.map(function (n) {
      if (n.sec) return '<div class="nav-label">' + n.sec + '</div>';
      var active = n.k === page ? ' active' : '';
      var count = n.c ? '<span class="count">' + n.c + '</span>' : '';
      return '<div class="nav-item' + active + '" onclick="location.href=\'' + n.h + '\'"><i class="ti ti-' + n.i + '"></i> ' + n.l + ' ' + count + '</div>';
    }).join('');
    sb.innerHTML = '<nav class="nav">' + items + '</nav>' +
      '<div class="side-foot"><div class="nav-item"><i class="ti ti-lifebuoy"></i> Help &amp; support</div></div>';
  }
})();
