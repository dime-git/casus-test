import { Playbook } from "../types";

/**
 * In production CASUS, playbooks are stored in Firestore per organization.
 * Each law firm uploads their own standards. Here we hardcode two examples.
 */
export const PLAYBOOKS: Record<string, Playbook> = {
  "nda-standard": {
    id: "nda-standard",
    name: "NDA Standard",
    description: "Standard Non-Disclosure Agreement template for DACH region",
    clauses: [
      {
        title: "Definition of Confidential Information",
        standardText:
          "Confidential Information means any and all non-public information, whether written, oral, electronic, or visual, disclosed by either Party to the other Party, including but not limited to trade secrets, business plans, financial data, customer lists, technical specifications, and proprietary software.",
        importance: "critical",
      },
      {
        title: "Obligations of Receiving Party",
        standardText:
          "The Receiving Party shall: (a) hold Confidential Information in strict confidence; (b) not disclose it to any third party without prior written consent; (c) use it solely for the Purpose; (d) protect it with at least the same degree of care used for its own confidential information, but no less than reasonable care.",
        importance: "critical",
      },
      {
        title: "Term and Duration",
        standardText:
          "This Agreement shall remain in effect for a period of two (2) years from the Effective Date. The confidentiality obligations shall survive termination for an additional period of three (3) years.",
        importance: "major",
      },
      {
        title: "Permitted Disclosures",
        standardText:
          "The Receiving Party may disclose Confidential Information to its employees, agents, or advisors who have a need to know, provided they are bound by confidentiality obligations no less restrictive than those in this Agreement.",
        importance: "major",
      },
      {
        title: "Return or Destruction",
        standardText:
          "Upon termination or upon request, the Receiving Party shall promptly return or destroy all Confidential Information and certify in writing that it has done so.",
        importance: "minor",
      },
      {
        title: "Remedies",
        standardText:
          "The Parties acknowledge that breach of this Agreement may cause irreparable harm. The Disclosing Party shall be entitled to seek injunctive relief in addition to any other remedies available at law or in equity.",
        importance: "major",
      },
      {
        title: "Governing Law",
        standardText:
          "This Agreement shall be governed by and construed in accordance with the laws of Switzerland. Any disputes shall be submitted to the exclusive jurisdiction of the courts of Zurich.",
        importance: "minor",
      },
      {
        title: "Non-Compete / Non-Solicitation",
        standardText:
          "During the term and for twelve (12) months thereafter, neither Party shall solicit or hire employees of the other Party who were involved in the exchange of Confidential Information.",
        importance: "major",
      },
    ],
  },
  "service-agreement": {
    id: "service-agreement",
    name: "Service Agreement (MSA)",
    description: "Master Service Agreement standard for consulting engagements",
    clauses: [
      {
        title: "Scope of Services",
        standardText:
          "The Service Provider shall perform the services as described in the applicable Statement of Work (SOW). Each SOW shall specify deliverables, timelines, and acceptance criteria.",
        importance: "critical",
      },
      {
        title: "Payment Terms",
        standardText:
          "Client shall pay invoices within thirty (30) days of receipt. Late payments shall accrue interest at 5% per annum. All fees are exclusive of applicable taxes.",
        importance: "critical",
      },
      {
        title: "Limitation of Liability",
        standardText:
          "Neither Party's aggregate liability shall exceed the total fees paid under this Agreement in the twelve (12) months preceding the claim. Neither Party shall be liable for indirect, incidental, or consequential damages.",
        importance: "critical",
      },
      {
        title: "Intellectual Property",
        standardText:
          "All intellectual property created in the performance of services shall be owned by the Client upon full payment. The Service Provider retains rights to pre-existing IP and general knowledge.",
        importance: "major",
      },
      {
        title: "Termination",
        standardText:
          "Either Party may terminate with sixty (60) days written notice. Immediate termination is permitted upon material breach if not cured within thirty (30) days of written notice.",
        importance: "major",
      },
      {
        title: "Confidentiality",
        standardText:
          "Both Parties shall maintain the confidentiality of all non-public information received in connection with this Agreement for a period of five (5) years following disclosure.",
        importance: "major",
      },
    ],
  },
};

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS[id];
}

export function listPlaybooks(): Array<{ id: string; name: string; description: string; clauseCount: number }> {
  return Object.values(PLAYBOOKS).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    clauseCount: p.clauses.length,
  }));
}
