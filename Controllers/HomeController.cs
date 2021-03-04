using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace DhtmlxGanttChartApp.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult SampleOne()
        {
            ViewBag.Projects = new List<SelectListItem>
            {
                new SelectListItem
                {
                    Value = "360",
                    Text = "PCP21322083 - Project Critical Path Testing (01-Feb-2021 - 31-Dec-2021)",
                    Selected = true
                }
            };

            return View();
        }

        public ActionResult CriticalPath()
        {
            ViewBag.Projects = new List<SelectListItem>
            {
                new SelectListItem
                {
                    Value = "360",
                    Text = "PCP21322083 - Project Critical Path Testing (01-Feb-2021 - 31-Dec-2021)",
                    Selected = true
                }
            };

            return View();
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }
    }
}