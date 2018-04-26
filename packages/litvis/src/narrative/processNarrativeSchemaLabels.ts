import * as _ from "lodash";
import generateNarrativeSchemaPlugin from "narrative-schema";
import { LabelType } from "narrative-schema-label";
import * as unified from "unified";
import * as select from "unist-util-select";
import { LitvisNarrative } from "../types";

export default async (narrative: LitvisNarrative): Promise<void> => {
  const lastFile = _.last(narrative.documents);
  if (!lastFile) {
    return;
  }

  const narrativeSchemaPlugin = generateNarrativeSchemaPlugin(
    narrative.composedNarrativeSchema,
  );

  for (const file of narrative.documents) {
    const engine = unified().use(narrativeSchemaPlugin);
    // .use(remark2rehype)
    // .use(html)
    // .use(compileNarrativeSchemaLabel);
    await engine.run(file.data.root, file);
    // const renderedHtml = await engine.stringify(rehypeAst);
    // file.data.renderedHtml = renderedHtml;
  }
  const combinedAst = {
    type: "parent",
    children: _.map(narrative.documents, (file) => file.data.root),
  };

  for (const rule of narrative.composedNarrativeSchema.rules) {
    const filteredNodes = _.filter(
      select(
        combinedAst,
        `narrativeSchemaLabel[labelName=${rule.selector.label}]`,
      ),
      (node) => (node as any).data.labelType !== LabelType.PAIRED_CLOSING,
    );
    try {
      if (
        _.isFinite(rule.minimumOccurrences) &&
        filteredNodes.length < rule.minimumOccurrences
      ) {
        throw new Error("minimumOccurrences");
      }
      if (
        _.isFinite(rule.maximumOccurrences) &&
        filteredNodes.length > rule.maximumOccurrences
      ) {
        throw new Error("maximumOccurrences");
      }
    } catch (e) {
      lastFile.message(
        rule.description,
        lastFile.data.root.position.end,
        "litvis:narrative-schema-rule",
      );
    }
  }
  // console.log(combinedAst);
  // console.log(narrative.composedNarrativeSchema.rules);

  // const combinedRenderedHtml = _.map(
  //   narrative.files,
  //   (file) => file.data.renderedHtml,
  // ).join("\n");
  // console.log(combinedRenderedHtml);
};