/**
 * depends: angularjs1.2
 */

// the application, system main object.
var osdrApp = angular.module('osdrApp', ['ngRoute', 'osdrControllers', 'osdrFilters', 'osdrServices', 'osdrDirectives']);
// the controllers, used to generate variety controllers for views.
var osdrControllers = angular.module('osdrControllers', []);
// the filters, for system to regenerate data.
var osdrFilters = angular.module('osdrFilters', []);
// the services, system model, RESTful data from backend api.
var osdrServices = angular.module('osdrServices', ['ngResource']);
// the directives, for some special features.
var osdrDirectives = angular.module('osdrDirectives', []);

// links,
var links = {
    index: {
        mount: "/" // ng_index.html
    },
    login: {
        mount: "/login", link: "#/login",
        page: "views/login.html", controller: "CLogin", text: "登录"
    },
    submit: {
        mount: "/submit", link: "#/submit",
        page: "views/submit.html", controller: "CSubmit", text: "填写日报"
    },
    view: {
        mount: "/view", link: "#/view",
        page: "views/view.html", controller: "CView", text: "查看日报"
    }
};

// for authentication jump
function jmp_to_user_login_page($location) {
    $location.path(links.login.mount);
}

// config the route
osdrApp.config(['$routeProvider', function($routeProvider) {
        $routeProvider
        .when(links.login.mount, {
            templateUrl: links.login.page, controller: links.login.controller
        })
        .when(links.submit.mount, {
            templateUrl: links.submit.page, controller: links.submit.controller
        })
        .when(links.view.mount, {
            templateUrl: links.view.page, controller: links.view.controller
        })
        .otherwise({
            redirectTo: links.submit.mount
        });
    }])
// config the http interceptor.
.config(['$httpProvider', function($httpProvider){
    $httpProvider.interceptors.push('MHttpInterceptor');
}])
//  controllers for app
.controller('CMain', ['$scope', '$location', function($scope, $location) {
    $scope.nav_brand_title = get_system_name() + "(v" + version + ")";
    $scope.__nav_active = null;

    // the navigator bind and update.
    $scope.navs = {
        submit: {mount: links.submit.mount, url: links.submit.link, text: links.submit.text, target:"_self"},
        view: {mount: links.view.mount, url: links.view.link, text: links.view.text, target:"_self"}
    };
    $scope.get_nav_active = function() {
        return $scope.__nav_active? $scope.__nav_active: $scope.navs.servers;
    };
    $scope.nav_active_submit = function() {
        $scope.__nav_active = $scope.navs.submit;
    };
    $scope.nav_active_view = function() {
        $scope.__nav_active = $scope.navs.view;
    };
    $scope.is_nav_selected = function(nav_or_navs) {
        if ($scope.__nav_active == nav_or_navs) {
            return true;
        }
        for (var i = 0; i < nav_or_navs.length; i++) {
            var nav = nav_or_navs[i];
            if ($scope.__nav_active == nav) {
                return true;
            }
        }
        return false;
    }
}]);
// controller: CLogin, for the view login.html.
osdrControllers.controller('CLogin', ['$scope', '$routeParams', 'MUser', function($scope, $routeParams, MUser){
    logs.info("请登录系统");
}]);
// controller: CSubmit, for the view submit.html.
osdrControllers.controller('CSubmit', ['$scope', '$routeParams', 'MUser', 'MProduct', 'MType', 'MReport', 'MRedmine',
    function($scope, $routeParams, MUser, MProduct, MType, MReport, MRedmine){
    // add new report object.
    $scope.report_reg = {
        user_id: null,
        date: absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000),
        modified: false,
        works: []
    };
    // consts
    $scope.const_product = get_product_label();
    $scope.const_type = get_type_label();
    $scope.enabled_redmine = enable_redmine_retieve();
    // the users return by server.
    $scope.users = {};
    // the products return by server.
    $scope.products = {};
    // the work types return by server.
    $scope.types = {};
    // when select user.
    $scope.on_change_user = function() {
        $scope.refresh_page(null);
    };
    // check
    $scope.check_for_change_date = function() {
        if ($scope.report_reg.modified) {
            logs.warn(0, "您修改了日报尚未提交，不能切换日期。您可以选择：<br/>" +
                "<li>手动修改日期后提交日报</li>" +
                "<li>或刷新页面，放弃所做的所有修改</li>");
            return false;
        }
        return true;
    }
    $scope.check_for_work = function(work) {
        if (!$scope.report_reg.user_id) {
            logs.warn("请选择填报人");
            return false;
        }
        if ($scope.report_reg.date == "") {
            logs.warn("请输入填报日期，格式为：年-月-日");
            return false;
        }
        if (object_is_empty(work.bug)) {
            logs.warn("请输入Issue号");
            return false;
        }
        if(isNaN(work.bug)){
            logs.warn("Issue号必须是整数");
            return false;
        }
        if (object_is_empty(work.product)) {
            logs.warn("请选择工作项所属的产品");
            return false;
        }
        if (object_is_empty(work.type)) {
            logs.warn("请选择工作项的类型");
            return false;
        }
        if (object_is_empty(work.time)) {
            logs.warn("请输入工作项所花的时间");
            return false;
        }
        if(isNaN(work.time) || Number(work.time) <= 0){
            logs.warn("工作项所花的时间必须是非零的数字");
            return false;
        }
        if(isNaN(work.time) || Number(work.time) > 12){
            logs.warn("工作项所花的时间不能大于12小时");
            return false;
        }
        if (object_is_empty(work.content)) {
            logs.warn("请输入工作项的内容");
            return false;
        }
        return true;
    }
    // when change date
    $scope.on_change_date_previous = function() {
        if (!$scope.check_for_change_date()) return;
        var date = YYYYmmdd_parse($scope.report_reg.date);
        date.setDate(date.getDate() - 1);
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_next = function() {
        if (!$scope.check_for_change_date()) return;
        var date = YYYYmmdd_parse($scope.report_reg.date);
        date.setDate(date.getDate() + 1);
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_today = function() {
        if (!$scope.check_for_change_date()) return;
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_yesterday = function() {
        if (!$scope.check_for_change_date()) return;
        var date = new Date();
        date.setDate(date.getDate() - 1);
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    $scope.on_change_date_previous_friday = function() {
        if (!$scope.check_for_change_date()) return;
        var date = new Date();
        date.setDate(date.getDate() - 2 - date.getDay());
        $scope.report_reg.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        $scope.refresh_page(null);
    };
    // when remove specified work item
    $scope.on_remove_work = function(work) {
        $scope.report_reg.modified = true;
        system_array_remove($scope.report_reg.works, work);
        logs.info("删除工作项" + (work.id? work.id:""));
    };
    $scope.on_modify_work = function(work) {
        work.editing = true;
        $scope.report_reg.modified = true;
        logs.info("修改工作项" + (work.id? work.id:""));
    };
    $scope.on_finish_work = function(work) {
        if (!$scope.check_for_work(work)) return;
        work.editing = false;
        $scope.report_reg.modified = true;
        logs.info("完成编辑工作项" + (work.id? work.id:""));
    };
    $scope.on_retrieve_work = function(work) {
        MRedmine.redmine_load({
            id: work.bug
        }, function(data){
            var report_content = data.issue.subject;
            if (report_content.lastIndexOf("。") == -1) {
                report_content += "。";
            }
            if(data.issue.status.name != "新建" && data.issue.status.name != "进行中"){
                report_content += data.issue.status.name + "。";
            }
            work.content = report_content;
            $scope.report_reg.modified = true;
            logs.info("获取Issue信息成功");
        });
    };
    $scope.on_add_empty_work = function() {
        $scope.report_reg.works.push(create_empty_work_item($scope.users.first));
    };
    $scope.on_submit_work = function() {
        for (var i = 0; i < $scope.report_reg.works.length; i++) {
            var work = $scope.report_reg.works[i];
            if (!$scope.check_for_work(work)) return;
        }
        if (object_is_empty($scope.report_reg.works) || $scope.report_reg.works.length <= 0) {
            logs.warn("请填写日报后提交");
            return;
        }
        var params = api_parse_reports_for_create(
            $scope.report_reg.date,
            $scope.report_reg.user_id,
            $scope.report_reg.works
        );
        MReport.reports_create(params, function(data){
            reset_report_work_item($scope.report_reg.works);
            $scope.report_reg.modified = false;
            alert("日报填写成功");
            logs.info("日报填写成功");
        });
    };
    $scope.refresh_page = function(callback) {
        MReport.reports_load({
            summary: 0,
            query_all: 1,
            start_time: $scope.report_reg.date,
            end_time: $scope.report_reg.date,
            user_id: $scope.report_reg.user_id
        }, function(data) {
            // parse the daily reports.
            $scope.report_reg.works = api_reports_for_reg($scope.products, $scope.types, data);
            // call the callback handler.
            if (callback) {
                callback(data);
            }
        });
    };

    $scope.$parent.nav_active_submit();

    // request products
    MProduct.products_load({}, function(data){
        $scope.products = api_products_for_select(data);
        logs.info("产品类型加载成功");
        // request types
        MType.types_load({}, function(data){
            $scope.types = api_types_for_select(data);
            logs.info("工作类别加载成功");
            // request users
            MUser.users_load({}, function(data){
                $scope.users = api_users_for_select(data);
                $scope.report_reg.user_id = $scope.users.first;
                logs.info("用户信息加载成功");
                $scope.refresh_page(function(data){
                    logs.info("日报信息加载成功");
                });
            });
        });
    });

    logs.info("数据加载中");
}]);
// controller: CView, for the view view.html.
osdrControllers.controller('CView', ['$scope', '$routeParams', '$location', 'MGroup', 'MUser', 'MProduct', 'MType', 'MReport',
    function($scope, $routeParams, $location, MGroup, MUser, MProduct, MType, MReport) {
    // the query conditions.
    $scope.query = {
        group: null,
        all: true,
        date: absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000)
    };
    // consts
    $scope.const_time_unit = get_view_sum_unit_label();
    // the groups from server.
    $scope.groups = {};
    // the users of group in query.
    $scope.users = {};
    // the products of group in query.
    $scope.products = {};
    // the types of group in query.
    $scope.types = {};
    // the report of query
    $scope.reports = {};
    // when change date
    $scope.on_change_date_previous = function() {
        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(date.getDate() - 1);
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    $scope.on_change_date_next = function() {
        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(date.getDate() + 1);
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    $scope.on_change_date_today = function() {
        $scope.query.date = absolute_seconds_to_YYYYmmdd(new Date().getTime() / 1000);
    };
    $scope.on_change_date_yesterday = function() {
        var date = new Date();
        date.setDate(date.getDate() - 1);
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    $scope.on_change_date_previous_friday = function() {
        var date = new Date();
        date.setDate(date.getDate() - 2 - date.getDay());
        $scope.query.date = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
    };
    // query report info from server.
    $scope.on_query = function() {
        $scope.reports.user_data = [];
        $scope.reports.day_product_data = [];
        $scope.reports.day_type_data = [];
        $scope.reports.month_product_data = [];
        $scope.reports.month_type_data = [];
        $scope.reports.quarter_product_data = [];
        $scope.reports.quarter_type_data = [];
        $scope.reports.year_product_data = [];
        $scope.reports.year_type_data = [];
        // render data
        $scope.reports.years = [];
        $scope.reports.quarters = [];
        $scope.reports.months = [];
        $scope.reports.days = [];
        $scope.reports.summaries = [];
        $scope.reports.users = [];

        MUser.users_load({
            query_all: $scope.query.all,
            group: $scope.query.group
        }, function(data){
            $scope.users = api_users_for_select(data);
            logs.info("组用户加载成功");
            MProduct.products_load({}, function(data){
                $scope.products = api_products_for_select(data);
                logs.info("产品类型加载成功");
                // request types
                MType.types_load({}, function(data){
                    $scope.types = api_types_for_select(data);
                    logs.info("工作类别加载成功");
                    $scope.query_report_user_detail();
                });
            });
        });
    };
    $scope.query_report_user_detail = function(){
        if (!$scope.users.first) {
            logs.warn(0, "选择的组没有用户");
            return;
        }

        logs.info("请求日期" + $scope.query.date + "的日报数据");
        var responsed_count = 0;
        for(var i = 0; i < $scope.users.users.length; i++){
            var user = $scope.users.users[i];
            logs.info("请求用户" + user.value + "在" + $scope.query.date + "的数据");
            var do_request = function(user){
                MReport.reports_load({
                    summary: 0,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: $scope.query.date,
                    end_time: $scope.query.date,
                    user_id: user.name
                }, function(data){
                    if (data.data.length > 0) {
                        $scope.reports.user_data.push(data.data);
                    }
                    logs.info("加载" + user.value + "日报数据成功，共" + data.data.length + "条日报");
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.users.users.length){
                        logs.info("加载用户日报成功");
                        $scope.query_report_day_product_summary();
                        return;
                    }
                });
            };
            do_request(user);
        }
    };
    $scope.query_report_day_product_summary = function() {
        logs.info("请求当天日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求当天日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + $scope.query.date + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.day_product_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载当天日报product汇总数据成功");
                        $scope.query_report_day_type_summary();
                        return;
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_day_type_summary = function() {
        logs.info("请求当天日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求当天日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + $scope.query.date + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.day_type_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载当天日报type汇总数据成功");
                        $scope.query_report_month_product_summary();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.query_report_month_product_summary = function() {
        logs.info("请求月度日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(date.getMonth() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求月度日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.month_product_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载月度日报product汇总数据成功");
                        $scope.query_report_month_type_summary();
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_month_type_summary = function() {
        logs.info("请求月度日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(date.getMonth() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求月度日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 1;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.month_type_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载月度日报type汇总数据成功");
                        $scope.query_report_quarter_product_summary();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.query_report_quarter_product_summary = function() {
        logs.info("请求季度日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(parseInt(date.getMonth() / 3 + 1) * 3);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求季度日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.quarter_product_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载季度日报product汇总数据成功");
                        $scope.query_report_quarter_type_summary();
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_quarter_type_summary = function() {
        logs.info("请求季度日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setMonth(parseInt(date.getMonth() / 3 + 1) * 3);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求季度日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.quarter_type_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载季度日报type汇总数据成功");
                        $scope.query_report_year_product_summary();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.query_report_year_product_summary = function() {
        logs.info("请求年度日报product汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setMonth(0);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setFullYear(date.getFullYear() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求年度日报product汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.products.products.length; i++){
            var product = $scope.products.products[i];
            logs.info("请求产品" + product.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(product){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    product_id: product.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.year_product_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.products.products.length){
                        logs.info("加载年度日报product汇总数据成功");
                        $scope.query_report_year_type_summary();
                    }
                });
            };
            do_request(product);
        }
    };
    $scope.query_report_year_type_summary = function() {
        logs.info("请求年度日报type汇总数据");

        var date = YYYYmmdd_parse($scope.query.date);
        date.setMonth(0);
        date.setDate(1);
        date.setMonth(parseInt(date.getMonth() / 3) * 3);
        var start_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);
        date.setFullYear(date.getFullYear() + 1);
        date.setDate(date.getDate() - 1);
        var end_time = absolute_seconds_to_YYYYmmdd(date.getTime() / 1000);

        logs.info("请求年度日报type汇总数据" + "，" + start_time + "至" + end_time);
        var responsed_count = 0;
        for(var i = 0; i < $scope.types.types.length; i++){
            var type = $scope.types.types[i];
            logs.info("请求类型" + type.value + "在" + start_time + "至" + end_time + "的数据");
            var do_request = function(type){
                MReport.reports_load({
                    summary: 1,
                    query_all: $scope.query.all,
                    group: $scope.query.group,
                    start_time: start_time,
                    end_time: end_time,
                    type_id: type.name
                }, function(data){
                    if (data.work_hours != null) {
                        $scope.reports.year_type_data.push(data);
                    }
                    // if all data requested, request other messages.
                    if(++responsed_count == $scope.types.types.length){
                        logs.info("加载年度日报type汇总数据成功");
                        $scope.render_report();
                        return;
                    }
                });
            };
            do_request(type);
        }
    };
    $scope.render_report = function() {
        logs.info("数据查询完毕，展示日报");
        $scope.render_year();
        $scope.render_quarter();
        $scope.render_month();
        $scope.render_day();
        $scope.render_summary();
        $scope.render_user();
    };
    $scope.render_year = function() {
        logs.info("展示年度汇总数据");

        $scope.reports.year_product_data.sort(work_hours_sort);
        if($scope.reports.year_product_data.length <= 0){
            return;
        }

        $scope.reports.year_type_data.sort(work_hours_sort);
        if($scope.reports.year_type_data.length <= 0){
            return;
        }

        var year = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.year_product_data.length; i++){
            year.product.labels.push($scope.products.kv[$scope.reports.year_product_data[i].product_id]);
            year.product.total_value += $scope.reports.year_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.year_product_data.length; i++){
            var percent = $scope.reports.year_product_data[i].work_hours * 100 / year.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            year.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.year_type_data.length; i++){
            year.type.labels.push($scope.types.kv[$scope.reports.year_type_data[i].type_id]);
            year.type.total_value += $scope.reports.year_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.year_type_data.length; i++){
            var percent = $scope.reports.year_type_data[i].work_hours * 100 / year.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            year.type.values.push(percent);
        }
        $scope.reports.years.push(year);
    };
    $scope.render_quarter = function() {
        logs.info("展示季度汇总数据");

        $scope.reports.quarter_product_data.sort(work_hours_sort);
        if($scope.reports.quarter_product_data.length <= 0){
            return;
        }

        $scope.reports.quarter_type_data.sort(work_hours_sort);
        if($scope.reports.quarter_type_data.length <= 0){
            return;
        }

        var quarter = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.quarter_product_data.length; i++){
            quarter.product.labels.push($scope.products.kv[$scope.reports.quarter_product_data[i].product_id]);
            quarter.product.total_value += $scope.reports.quarter_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.quarter_product_data.length; i++){
            var percent = $scope.reports.quarter_product_data[i].work_hours * 100 / quarter.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            quarter.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.quarter_type_data.length; i++){
            quarter.type.labels.push($scope.types.kv[$scope.reports.quarter_type_data[i].type_id]);
            quarter.type.total_value += $scope.reports.quarter_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.quarter_type_data.length; i++){
            var percent = $scope.reports.quarter_type_data[i].work_hours * 100 / quarter.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            quarter.type.values.push(percent);
        }
        $scope.reports.quarters.push(quarter);
    };
    $scope.render_month = function() {
        logs.info("展示月度汇总数据");

        $scope.reports.month_product_data.sort(work_hours_sort);
        if($scope.reports.month_product_data.length <= 0){
            return;
        }

        $scope.reports.month_type_data.sort(work_hours_sort);
        if($scope.reports.month_type_data.length <= 0){
            return;
        }

        var month = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.month_product_data.length; i++){
            month.product.labels.push($scope.products.kv[$scope.reports.month_product_data[i].product_id]);
            month.product.total_value += $scope.reports.month_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.month_product_data.length; i++){
            var percent = $scope.reports.month_product_data[i].work_hours * 100 / month.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            month.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.month_type_data.length; i++){
            month.type.labels.push($scope.types.kv[$scope.reports.month_type_data[i].type_id]);
            month.type.total_value += $scope.reports.month_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.month_type_data.length; i++){
            var percent = $scope.reports.month_type_data[i].work_hours * 100 / month.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            month.type.values.push(percent);
        }
        $scope.reports.months.push(month);
    };
    $scope.render_day = function() {
        logs.info("展示当天汇总数据");

        $scope.reports.day_product_data.sort(work_hours_sort);
        if($scope.reports.day_product_data.length <= 0){
            return;
        }

        $scope.reports.day_type_data.sort(work_hours_sort);
        if($scope.reports.day_type_data.length <= 0){
            return;
        }

        var day = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            product: {
                text: get_product_label(),
                labels: [],
                values: [],
                total_value: 0
            },
            type: {
                text: get_type_label(),
                labels: [],
                values: [],
                total_value: 0
            }
        };
        for(var i = 0; i < $scope.reports.day_product_data.length; i++){
            day.product.labels.push($scope.products.kv[$scope.reports.day_product_data[i].product_id]);
            day.product.total_value += $scope.reports.day_product_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.day_product_data.length; i++){
            var percent = $scope.reports.day_product_data[i].work_hours * 100 / day.product.total_value;
            percent = Number(Number(percent).toFixed(1));
            day.product.values.push(percent);
        }
        for(var i = 0; i < $scope.reports.day_type_data.length; i++){
            day.type.labels.push($scope.types.kv[$scope.reports.day_type_data[i].type_id]);
            day.type.total_value += $scope.reports.day_type_data[i].work_hours;
        }
        for(var i = 0; i < $scope.reports.day_type_data.length; i++){
            var percent = $scope.reports.day_type_data[i].work_hours * 100 / day.type.total_value;
            percent = Number(Number(percent).toFixed(1));
            day.type.values.push(percent);
        }
        $scope.reports.days.push(day);
    };
    $scope.render_summary = function() {
        logs.info("展示当天摘要数据");

        // generate the users array specified by submited or not submited.
        var users_submited = [], users_submited_ids = [], users_not_submited = [];
        var build_users_specified_by_submited = function() {
            for(var i = 0; i < $scope.users.users.length; i++){
                var user = $scope.users.users[i];
                var user_reported = false;

                for(var j = 0; j < $scope.reports.user_data.length; j++){
                    if(user.name == $scope.reports.user_data[j][0].user_id){
                        users_submited.push(user.value);
                        users_submited_ids.push(user.name);
                        user_reported = true;
                    }
                }

                if(!user_reported){
                    users_not_submited.push(user.value);
                }
            }
        };
        build_users_specified_by_submited();

        var delay_users = [];
        var get_delayied_report_summary = function() {
            for(var i = 0; i < users_submited_ids.length; i++){
                var user_id = users_submited_ids[i];

                for(var j = 0; j < $scope.reports.user_data.length; j++){
                    var user_data = $scope.reports.user_data[j];

                    if(user_id != user_data[0].user_id){
                        continue;
                    }

                    var work_date = user_data[0].work_date;

                    user_data.sort(report_first_insert_sort);
                    var first_insert = user_data[0].insert_date;

                    user_data.sort(report_modify_date_sort);
                    var last_modify = user_data[0].modify_date;

                    // detect the delayed reports
                    if(!is_report_delayed(YYYYmmdd_parse(work_date), YYYYmmdd_parse(first_insert))){
                        continue;
                    }

                    delay_users.push({
                        name: $scope.users.kv[user_id],
                        submit_time: first_insert,
                        last_modify: last_modify
                    });
                }
            }
        };
        get_delayied_report_summary();

        var summary = {
            text: YYYYmmdd_parse($scope.query.date).getFullYear(),
            total: $scope.users.users.length,
            ok: $scope.reports.user_data.length,
            ok_users: users_submited,
            failed: $scope.users.users.length - $scope.reports.user_data.length,
            failed_users: users_not_submited,
            delay: delay_users.length,
            delay_users: delay_users
        };
        $scope.reports.summaries.push(summary);
    };
    $scope.render_user = function() {
        logs.info("展示用户详细数据");
        $scope.reports.user_data.sort(user_id_sort);

        if($scope.reports.user_data.length <= 0){
            return;
        }

        for(var i = 0; i < $scope.reports.user_data.length; i++){
            var user_data = $scope.reports.user_data[i];
            user_data.sort(report_sort);

            var user = {
                text: YYYYmmdd_parse($scope.query.date).getFullYear(),
                works: [],
                summary: {
                    total: null,
                    insert: null,
                    modify: null
                },
                product: {
                    text: null,
                    labels: [],
                    values: [],
                    total_value: 0
                },
                type: {
                    text: null,
                    labels: [],
                    values: [],
                    total_value: 0
                }
            };

            for(var j = 0; j < user_data.length; j++) {
                var o = user_data[j];
                user.name = $scope.users.kv[o.user_id];
                user.works.push({
                    bug: o.bug_id,
                    time: o.work_hours,
                    type: $scope.types.kv[o.type_id],
                    product: $scope.products.kv[o.product_id],
                    content: o.report_content
                });
            }

            if(1){
                var total_value = 0;
                var products_merged = {};
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    products_merged[$scope.products.kv[o.product_id]] = 0;
                }
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    total_value += o.work_hours;
                    products_merged[$scope.products.kv[o.product_id]] += o.work_hours;
                }

                // dump to object array for sort
                var products_merged_object_array = [];
                for(var key in products_merged){
                    products_merged_object_array.push({name:key, work_hours:products_merged[key]});
                }
                products_merged_object_array.sort(work_hours_sort);

                // summaries
                user_data.sort(report_first_insert_sort);
                var first_insert = user_data[0].insert_date;
                user_data.sort(report_modify_date_sort);
                var last_modify = user_data[0].modify_date;
                user.summary.total = Number(Number(total_value).toFixed(1));
                user.summary.insert = first_insert;
                user.summary.modify = last_modify;

                var values = [];
                var labels = [];
                for(var j = 0; j < products_merged_object_array.length; j++){
                    var key = products_merged_object_array[j].name;
                    var work_hours = products_merged_object_array[j].work_hours;

                    labels.push(key);
                    var percent = work_hours * 100 / total_value;
                    percent = Number(Number(percent).toFixed(1));
                    values.push(percent);
                }

                user.product.total_value = total_value;
                user.product.labels = labels;
                user.product.values = values;
            }

            if(1){
                var total_value = 0;
                var types_merged = {};
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    types_merged[$scope.types.kv[o.type_id]] = 0;
                }
                for(var j = 0; j < user_data.length; j++){
                    var o = user_data[j];
                    total_value += o.work_hours;
                    types_merged[$scope.types.kv[o.type_id]] += o.work_hours;
                }

                // dump to object array for sort
                var types_merged_object_array = [];
                for(var key in types_merged){
                    types_merged_object_array.push({name:key, work_hours:types_merged[key]});
                }
                types_merged_object_array.sort(work_hours_sort);

                var values = [];
                var labels = [];
                for(var j = 0; j < types_merged_object_array.length; j++){
                    var key = types_merged_object_array[j].name;
                    var work_hours = types_merged_object_array[j].work_hours;

                    labels.push(key);
                    var percent = work_hours * 100 / total_value;
                    percent = Number(Number(percent).toFixed(1));
                    values.push(percent);
                }

                user.type.total_value = total_value;
                user.type.labels = labels;
                user.type.values = values;
            }

            $scope.reports.users.push(user);
        }
    };

    // loads groups info.
    MGroup.groups_load({}, function(data){
        logs.info("加载用户组成功");
        $scope.groups = api_groups_for_select(data);
        $scope.query.group = $scope.groups.first;
    });

    $scope.$parent.nav_active_view();
    logs.info("数据加载中");
}]);

// directives.
/**
 * bsmPopover(bsm-popover), the popover component
 * @see: http://v2.bootcss.com/javascript.html#popovers
 * @see: http://subliminalsources.com/9/building-angularjs-bootstrap-components-popover-directive-part-1/
 * use the expression of angularjs, the attr must use the osdr- prefixed:
        <div ng-repeat="year in data.years">
            <div osdr-pie osdr-labels="year.product.labels" osdr-values="year.product.values"></div>
        </div>
 * we will use the scope.year.product.labels as labels and scope.year.product.values as values.
 */
osdrDirectives.directive('osdrPie', function(){ // bsm-popover
    return {
        restrict: 'A', // 'A': attribute osdr-pie required.
        replace: false,
        transclude: false,
        scope: false,
        link: function(scope, element, attrs) {
            var labels = scope;
            var labels_objs = attrs.osdrLabels.split(".");
            for (var i = 0; i < labels_objs.length; i++) {
                labels = labels[labels_objs[i]];
            }

            var values = scope;
            var values_objs = attrs.osdrValues.split(".");
            for (var i = 0; i < values_objs.length; i++) {
                values = values[values_objs[i]];
            }

            var id = "raphael_id_" + labels.length + "_" + values.length + "_" + Number(new Date().getTime() * 1000).toFixed(0);
            element.attr("id", id);
            Raphael(id, 220, 220).pieChart(0.1/*hsb_start*/, 110, 110, 100, values, labels, "#fff");
        }
    };
});

// config the filter
// the filter for the main app, the index page.
osdrFilters
.filter('unsafe', function($sce) {
    return function(val) {
        return $sce.trustAsHtml(val);
    };
})
.filter('brjoin', function() {
    return function(val) {
        return String(val.join('<br/>'));
    };
})
.filter('cmjoin', function() {
    return function(val) {
        return String(val.join(','));
    };
})
.filter('sample_filter', function() {
    return function(input) {
        return input? "not-null":"null";
    };
})
.filter('main_nav_active', function() {
    return function(is_active) {
        return is_active? "active": null;
    };
})
.filter('filter_div_empty_class', function() {
    return function(v) {
        return v? "": "error";
    };
})
.filter('filter_div_null_class', function() {
    return function(v) {
        return (v == null || v == undefined)? "error": "";
    };
})
.filter('filter_bug_url', function() {
    return function(bug_id) {
        return get_redmine_issue_url() + "/" + bug_id;
    };
})
.filter('filter_redmine_url', function() {
    return function(bug_id) {
        return get_origin_redmine_url() + "/" + bug_id;
    };
})
.filter('filter_data_text', function() {
    return function(data) {
        var ret = [];
        for(var i = 0; i < data.values.length; i++){
            ret.push(data.labels[i] + ": " + data.values[i] + "%");
        }
        if(enable_view_sum()){
            ret.push(get_view_sum_label() + Number(Number(data.total_value).toFixed(1)) + get_view_sum_unit_label());
        }
        return ret;
    };
})
;

// config the services
osdrServices.factory('MUser', ['$resource', function($resource){
    return $resource('/users', {}, {
        users_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MGroup', ['$resource', function($resource){
    return $resource('/groups', {}, {
        groups_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MProduct', ['$resource', function($resource){
    return $resource('/products', {}, {
        products_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MType', ['$resource', function($resource){
    return $resource('/work_types', {}, {
        types_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MReport', ['$resource', function($resource){
    return $resource('/reports', {}, {
        reports_load: {method: 'GET'},
        reports_create: {method: 'POST'}
    });
}]);
osdrServices.factory('MRedmine', ['$resource', function($resource){
    return $resource('/redmines/:id', {}, {
        redmine_load: {method: 'GET'}
    });
}]);
osdrServices.factory('MHttpInterceptor', function($q, $location){
    // register the interceptor as a service
    // @see: https://code.angularjs.org/1.2.0-rc.3/docs/api/ng.$http
    // @remark: the function($q) should never add other params.
    return {
        'request': function(config) {
            return config || $q.when(config);
        },
        'requestError': function(rejection) {
            return $q.reject(rejection);
        },
        'response': function(response) {
            if (response.data.code && response.data.code != Errors.Success) {
                osdr_on_error($location, response.data.code, response.status, response.data.desc);
                // the $q.reject, will cause the error function of controller.
                // @see: https://code.angularjs.org/1.2.0-rc.3/docs/api/ng.$q
                return $q.reject(response.data.code);
            }
            return response || $q.when(response);
        },
        'responseError': function(rejection) {
            code = osdr_on_error($location, Errors.UIApiError, rejection.status, rejection.data);
            return $q.reject(code);
        }
    };
});
