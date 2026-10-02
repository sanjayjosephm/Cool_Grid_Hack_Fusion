# CoolGrid analysis

> Historical assessment saved on 2 October 2026. This export preserves the original critique and its revised external-debate ruling. Statements labelled “current” describe that stage of the analysis. Continue with [research and shortlist debate](02-research-and-debate.md) and [stakeholder validation](03-stakeholder-validation.md) for the later findings.

> Event rules: [context.md](../context.md). This file is an analysis archive, not evidence of a completed build or validated user outcomes.

Saved on 2 October 2026, using Australia/Sydney for event dates.

This document preserves the original critical assessment of the CoolGrid Perplexity conversation, the subsequent assessment using an external agent debate, and the resulting prototype and validation recommendations. It is based on the project’s local context.md rules snapshot and the four exchanges in the linked conversation.

**Current conclusion: narrow CoolGrid before pivoting.** The most defensible prototype hypothesis is a council workflow for preparing neighbourhood assessment or outreach shortlists supporting heatwave-resilient electrification. The earlier 5/10 advice rating has been withdrawn, and cooling-hub planning has no established advantage as a replacement concept.

No completed build, real council interview, or deployment was demonstrated in the assessed material. The analysis evaluates the proposed project and advice; it does not establish that councils need the product or that the proposed interventions produce the stated effects.

[Source Perplexity conversation](https://www.perplexity.ai/search/29fbb1d2-62f1-40ef-bf3e-52c08b8a412b). The rules source is the local ClimateHack project file context.md, dated 2 October 2026. That file is not attached to this Page.

No prototype tests, user-task comparisons, or climate-outcome studies were carried out as part of this analysis.

## Proposal assessed in the source chat

The original CoolGrid concept was a neighbourhood planning tool for councils and energy planners, intended to pair electric heat-pump retrofits with measures such as insulation, shading, solar, batteries, cooling hubs, and network upgrades according to local risk.

The proposed prototype used roughly 8–15 sample areas, a colour-coded map, a selected-area profile, recommendations, and comparisons between progressively larger intervention packages. Inputs covered heat exposure, social vulnerability, building inefficiency, grid pressure, and existing resilience. Grid capacity, some costs, and intervention effects were explicitly illustrative.

The user proposed Next.js, PostgreSQL, and Vercel. The chat added map, chart, ORM, API, and database suggestions. The assessment treats the stack as capable of supporting a small prototype; the priority is a defensible decision and testable workflow, not adding technologies.

The chat’s strongest advice was to use a small geography, a defined council user, transparent rules, visible assumptions, and one complete demo. Its unsupported safety classifications, arbitrary effects, impact estimates, and originality claims are evaluated below.

This is a summary of what was assessed, not a full archive of the external Perplexity transcript.

## Revised assessment after external debate

**The debate changed the recommendation: narrow CoolGrid before pivoting.**

Separate defender and critic agents produced opening arguments, received the opposing case for rebuttal, and submitted both cases to a separate judge. Their strongest challenge was to the original assessment.

| Earlier position | Revised judgment |
|---|---|
| “5/10 as hackathon advice” | Withdraw the rating: it lacked a defined scoring basis. |
| Arbitrary scenario effects undermine the prototype | They can support an honestly labelled interaction demo. They cannot establish actual savings, safety, or climate impact. |
| Existing Melbourne maps weaken originality | Correct, but a useful planning workflow could still add value beyond those maps. |
| Cooling-hub planning is the preferred pivot | Premature. It introduces its own facility, accessibility, operating, and backup-power uncertainties. |

The factual criticisms remain: the formula’s range is wrong, the electrification danger hook is unsupported, and “safe to electrify” labels exceed the available evidence. However, context.md explicitly accepts testable mockups; an operationally calibrated climate model is unnecessary.

**The stronger prototype hypothesis is:**

> CoolGrid helps a council climate team prepare a shortlist of neighbourhoods for household assessments supporting heatwave-resilient electrification.

That moves the output to a decision the prototype can plausibly support: **where to investigate next**. Missing building or grid information becomes a visible assessment requirement.

Demonstrate one municipality, a few areas, and a limited number of illustrative assessment slots. Use existing heat-vulnerability data plus one defensible contextual input relevant to the proposed program. Show sources, dates, unknowns, selection reasons, and questions requiring field verification. Area-level statistics must remain contextual proxies.

The debate also resolved an important disagreement: **CoolGrid does not have to change the existing map’s ranking to be useful.** It might produce a better assessment brief or reduce research effort while preserving correct interpretation. But claiming *better prioritisation* requires stronger evidence.

Test both possibilities:

- **Mechanism:** check data joins and rules; show how relevant inputs and missing information affect the output.

- **Workflow:** give a relevant user or mentor the same planning task using the existing map and CoolGrid. Compare completeness, interpretation errors, recognition of uncertainty, and time.

- **Decision threshold:** retain the concept if it demonstrates an actionable difference or useful workflow improvement. Remove scoring or change the workflow if invented effects supply its entire persuasive case.

Creativity, user demand, and comparative usefulness remain unproven. The debate provides a better testable proposal; agreement between agents does not validate it.

Evidence should govern the ruling. The persuasion research supports benefits in its tested oversight setting, while other research found that voting explained most gains attributed to debate—so these methods require careful application. [Persuasive-debater study](https://proceedings.mlr.press/v235/khan24a.html), [Debate or Vote](https://arxiv.org/abs/2508.17536).

## Original critique retained for reference

**Historical assessment:** this section preserves the initial critique. Its 5/10 rating is withdrawn, and its preference for a cooling-hub pivot is superseded by the revised assessment above. Other criticisms remain subject to the qualifications in the debate ruling below.

**Original verdict: the chat explains CoolGrid well, then gives it more credibility than the evidence supports. It was rated roughly 5/10 as hackathon advice.** It helps you design persuasive screens before establishing what those screens can truthfully claim.

All four exchanges in the Perplexity conversation were read. This assessment concerns the proposed project and advice; there is no completed build shown to assess.

Using the criteria in context.md:

| Criterion | Weight | Assessment of the proposal |
|---|---:|---|
| COP31 alignment | 30% | Clear fit with Resilient Cities & Buildings. The electrification danger argument weakens the evidence. |
| Build quality | 30% | A feasible interface, but a weak plan for validating its recommendations. Actual implementation is unassessable. |
| Creativity | 20% | Plausible combination of ideas; meaningful differentiation remains unproven. |
| Presentation clarity | 20% | Understandable user journey, undermined by an overstated opening and excessive scope. |

### The central hook contains a causal leap

The initial proposal connects gas-to-electric heating, heatwave blackouts, and deaths. Those connections need separate evidence.

The 374 excess deaths during Victoria’s 2009 heatwave are documented. That figure does **not** establish how many deaths were caused by outages, or what additional harm electrification would create. [Victorian Auditor-General’s report](https://www.audit.vic.gov.au/report/heatwave-management-reducing-risk-public-health)

More damagingly, the Victorian electrification report cited in the chat says summer cooling is already electric in both modelled scenarios. It attributes the additional summer peak demand to electrifying cooking and water heating; electrified heating has a larger winter effect. It concerns new dwellings, so applying it directly to neighbourhood retrofits also requires care. [Report, pp. 24–26](https://www.parliament.vic.gov.au/4a1997/globalassets/tabled-paper-documents/tabled-paper-8434/5---delwp-electrification-impacts-report.pdf)

A gas heater did not provide summer cooling before the retrofit. Replacing it does not automatically create a new dependence on electricity for cooling.

Perplexity initially acknowledges the uncertainty, which deserves credit. But its later pitch again implies that the transition has left someone without cooling. **The caveat and the recommended story pull in different directions.**

Keep the supported problem: vulnerable residents need access to cooling during heatwaves and outages. Establish any additional electrification risk separately.

### The scoring model is arbitrary and mathematically mislabelled

It proposes:

`Priority = 0.30H + 0.25V + 0.20B + 0.15G − 0.10R`

Here H is heat exposure, V is social vulnerability, B is building inefficiency, G is grid stress, and R is existing resilience.

With each input between 0 and 100, the possible output is **−10 to 90**, not 0–100. Negative results have no defined category, and scores above 90 are impossible.

That is an easily repaired arithmetic issue. The deeper problems are unanswered:

- Why those weights?

- What measurements become the component scores?

- Why does 34 mean “electrification-ready” while 35 means support is required?

- What happens when grid-capacity data is missing?

- Does the recommendation change substantially under other reasonable weights?

A transparent formula can still produce unjustified recommendations. Labels such as “ready to electrify” and “minimum safe electrification” imply knowledge the proposed model does not possess.

### The simulator risks demonstrating conclusions programmed into it

The suggested effects—20% improvement from insulation, 10% from solar, 25% from batteries—are explicitly assumptions. Disclosure is good, but it does not establish those effects.

If selecting an intervention automatically improves its score, the demo shows that the interface follows your rules. It does not demonstrate that the intervention produces the claimed benefit.

The nested scenarios also make the answer almost predetermined: progressively add more equipment, then show better outcomes. A planner needs to know **which investment earns its cost under a constraint**, not simply that the largest package contains more measures.

There is also no demonstrated calculation connecting the proposed inputs to tonnes of emissions, household bills, peak demand, or people protected. A unitless priority score cannot supply those quantities.

The hackathon permits an illustrative, testable prototype. Your claims must match what you actually test.

### The claimed originality has barely been examined

Victoria already provides a [Cooling and greening Melbourne map](https://www.planning.vic.gov.au/guides-and-resources/Data-spatial-and-insights/cooling-and-greening-melbourne-map) combining vegetation, urban heat, and a heat-vulnerability index incorporating demographic sensitivity and socioeconomic adaptive capacity.

That does not prove an identical CoolGrid exists. It does mean that combining heat and vulnerability on a map is insufficient differentiation.

The chat declares the combination creative without adequately investigating existing workflows or tools. A stronger claim would be a specific additional decision, such as:

> Under a fixed budget, which council facilities should be assessed first for backup-powered cooling?

Then demonstrate how the tool improves that decision beyond inspecting the existing map.

### Its treatment of outage resilience misses essential engineering conditions

Solar panels and batteries do not automatically provide cooling during a blackout. Most grid-connected solar-only systems shut down during outages. Battery backup requires an appropriate configuration, and may supply only selected circuits. Available energy and inverter power also constrain what can operate. [Australian Government battery guidance](https://www.energy.gov.au/solar/get-know-solar-technology/batteries)

Similarly, insulation’s summer performance depends on the building and accompanying passive design. Official guidance warns that inadequate shading can allow insulation to retain accumulated heat. [YourHome insulation guidance](https://www.yourhome.gov.au/passive-design/insulation)

These conditions are central to a product promising heatwave resilience. A generic “add battery → resilience increases” switch is too crude to support that promise.

### The product scope exceeds the demonstrated user problem

The fictional council officer is a useful starting point. It is not evidence that councils lack this capability, possess the required data, or can implement all the suggested actions.

The proposal spans household retrofits, subsidies, network upgrades, distributed generation, public facilities, emergency access, and investment planning. Those involve different decision owners and constraints.

Meanwhile, it proposes several pages, APIs, tables, filters, and outcome metrics. The stack can support a prototype; the harder problem is deciding **what one recommendation means and why anyone should trust it**.

**What to keep:** one council user, a small geography, explainable rules, visible assumptions, and one complete two-minute journey. Avoiding unnecessary machine learning and distinguishing public, derived, and illustrative data are sensible recommendations.

**Initial recommendation, now superseded:** narrow CoolGrid to one council decision, preferably cooling-hub planning:

> CoolGrid helps council planners compare candidate cooling-hub upgrades, showing gaps in access, indicative costs, and estimated backup runtime under explicit assumptions.

The suggested demonstration was one council area, a few neighbourhoods, two candidate facilities, and one constrained comparison. Dated public data, assumed costs, and unverified facility characteristics would be labelled. Potential catchment coverage would not be presented as residents already protected.

Suggested weekend validation was to check a calculation independently, test insufficient backup capacity and missing data, vary uncertain assumptions, and have a mentor or representative user review whether the result is understandable and actionable. The limits of that review would be reported.

Resilience alone fits the chosen priority; context.md permits focusing on one part of a priority. The disputed electrification-danger hook is unnecessary to justify the project.

Submission requirements remain public review links, the repository requirement, resource and AI disclosures, a video of at most two minutes, and submission before **4 October 2026, 21:00 AEDT**.

**Before adding more screens, make one recommendation defensible: why this intervention, for this location, at this cost—and what evidence could prove it wrong?**

## Debate ruling and remaining uncertainty

**Ruling: narrow CoolGrid before pivoting.** The original critique was right about unsupported claims, but too confident about the rating and the superiority of cooling-hub planning.

### What the defender established

The accepted prototype format does not require calibrated health or grid predictions. Missing dwelling and grid data restricts the tool to an upstream decision, such as where a council should recruit households for professional assessments. It cannot establish that particular homes are safe to electrify or prescribe equipment.

Existing heat-vulnerability ranking is a baseline and may already be sufficient. Extra inputs need a demonstrated purpose; extra weights alone add no credibility. The cooling-hub alternative needs evidence about facility capacity, backup circuits, cooling load, accessibility, and operating arrangements.

### What the critic established

Renaming an output “assessment screening” does not repair it if the recommendation still implies reliable retrofit-benefit rankings. A decision owner, limited resource, actionable output, and observable success criterion remain necessary.

Illustrative scenario effects can test comprehension and interaction. They cannot substantiate reduced deaths, emissions, or outage harm. Disclaimers and sensitivity controls do not validate arbitrary effects.

The 2021 study does not substantiate the stated causal hook, but it does not disprove every possible summer effect from electrification. An existing vulnerability map defeats a broad uniqueness claim, not every possible workflow innovation.

### The disagreement resolved by the judge

Changed heat-vulnerability ranking is **not required** for useful added value. A tool may retain the same shortlist while reducing research time, exposing missing information, or producing a clearer assessment brief.

Faster interaction or greater confidence alone does not prove value. Compare the same council task against the existing map, preserving correct interpretation and awareness of uncertainty. If CoolGrid claims better prioritisation, it must establish why its different selections are preferable.

### Unresolved questions

- Does a plausible council program or partner have authority and resources to act on the proposed shortlist?

- What defensible, non-duplicative input adds value beyond existing heat-vulnerability data?

- Does the existing map already support the same task equally well?

- Do missing inputs or reasonable changes in assumptions make the shortlist too unstable to use?

- What can the team actually build and test within the event window?

No real council interview, facility assessment, program partnership, or completed build was established. In the debate, the defender and critic used the supplied transcript summary; they did not independently reread the inaccessible Perplexity page. The original source conversation was read through the browser during the first assessment.

## Proposed prototype and acceptance tests

This is a hypothesis to test, not an established council requirement.

**User:** a council adaptation or climate officer.

**Task:** prepare an assessment or outreach shortlist for one municipality.

**Demonstration scope:** approximately 8–15 areas and an illustrative allocation of 20 assessment slots. These numbers are proposed scope choices, not real program data.

Use existing heat-vulnerability information plus one defensible contextual input that matters to the intended workflow. Publicly reported tenure composition is an example only where it is relevant to the program. Area-level tenancy statistics cannot establish individual household eligibility.

Show each source and date, limitations, unknowns, reasons for inclusion, and questions requiring field verification. Missing data should trigger a follow-up question or an explicit limitation, not a low-risk or “safe” label.

Remove the composite score unless its rules have a defensible purpose. Remove predicted safety, equipment prescriptions, savings percentages, and superior-ranking claims unless separately supported. Produce a usable assessment brief and next action.

| Test | What it establishes | What it does not establish |
|---|---|---|
| Check source joins and transformations | The demonstrated data pipeline behaves correctly | Current household conditions |
| Vary a relevant input while holding vulnerability constant | How the rule affects a meaningful action | That the changed action is optimal |
| Expose missing data and test sensitivity | Whether uncertainty is communicated and selections are fragile | Validity of arbitrary effect assumptions |
| Compare the same task with the existing map | Task completion, interpretation errors, recognition of unknowns, and time | Population-wide adoption or causal climate benefits |
| Mentor or representative-user review | Initial plausibility and comprehension in a small sample | Full council validation or deployment readiness |

**Retain CoolGrid** if the intended owner can act and the demonstration shows an appropriate action difference or useful workflow improvement with equally sound interpretation.

**Remove scoring or change the decision** if invented effects drive the argument, the extra input is irrelevant, uncertainty produces unjustifiable selections, or the baseline completes the task equally well.

**Pivot to cooling hubs** only if that decision has better evidenced inputs and an actionable owner. It receives no automatic advantage from sounding narrower.

## Reasoning approach and research limits

The user requested three concepts: Multi-Agent External Debate, adversarial oversight and persuasion, and internal “societies of thought.”

For this assessment, separate agents were assigned defender, critic, and judge roles. The defender and critic produced opening arguments and exchanged cases for rebuttal. The judge assessed the remaining disagreements against the event criteria and evidence. These were separate agent instances with distinct roles, not a measured comparison of different model families or judge capability levels.

The review used alternative hypotheses, counterexamples, and tests that could falsify the recommendation. The saved material contains argument summaries and conclusions, not a private internal reasoning trace.

Consensus and persuasiveness were not treated as proof. The persuasive-debater study found benefits in its tested oversight setting; the Debate or Vote study found that majority voting accounted for most gains attributed to debate across its evaluated benchmarks. The “societies of thought” paper studies perspective diversity in particular reasoning models; it does not establish a universal guarantee that internal debate catches hallucinations.

- [Debating with More Persuasive LLMs Leads to More Truthful Answers](https://proceedings.mlr.press/v235/khan24a.html)

- [Debate or Vote Which Yields Better Decisions in Multi Agent Large Language Models](https://arxiv.org/abs/2508.17536)

- [Reasoning Models Generate Societies of Thought](https://arxiv.org/abs/2601.10825)

The debate improved the specificity of the proposed validation target. It did not provide new evidence of actual user demand or intervention effectiveness.

## Event requirements to preserve

These requirements are taken from the project’s context.md snapshot dated 2 October 2026. They are not a claim that later organizer announcements have been checked.

| Requirement | Planning implication |
|---|---|
| COP31 alignment 30%, build quality 30%, creativity 20%, presentation clarity 20% | Demonstrate a clear priority connection, a testable core, a distinctive approach, and a plain-language user story |
| Working proof of concept or realistic clickable mockup accepted | A finished commercial product or operationally calibrated model is unnecessary |
| One part of one priority can be sufficient | Heat resilience alone can fit Resilient Cities & Buildings |
| 3–5 active eligible members, each individually registered and in the actual Junction team | Verify eligibility and team setup |
| Submitted construction begins 2 October 2026 at 09:00 AEST | Keep the submitted build within the event window |
| All outside resources and material AI use disclosed | Record datasets, libraries, APIs, paid resources, and AI contributions |
| Public code repository required by the participant guide | Mockup acceptance does not establish a repository exemption |
| Demo or pitch video at most two minutes | Demonstrate one complete user journey |
| Review links must open without access requests | Test public access |
| Submission closes 4 October 2026 at 21:00 AEDT | Use the guide’s earlier cutoff and leave upload time |

The guide and Discord FAQ disagree about repository handling for code-free mockups; context.md recommends following the guide. Other unresolved rules include exact video/slides details, ceremony time, certain asset boundaries, and post-deadline small-fix limits.

The event’s 2035 percentages are challenge targets with incompletely specified baselines and denominators. They should not be presented as independently verified climate statistics.
