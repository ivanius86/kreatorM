(function () {
  "use strict";
  const planning=()=>window.MentorPlanningRepository, inventory=()=>window.MentorInventoryService, repository=()=>window.MentorInventoryRepository, conversion=()=>window.MentorNutritionUnitConversion;
  const ACTIVE=["planned","reserved","partially_reserved","missing"],round=(value)=>Math.round((Number(value)+Number.EPSILON)*1000)/1000,clone=(value)=>JSON.parse(JSON.stringify(value));
  const calendarSegment=(mealType)=>mealType==="breakfast"?"morning":mealType==="dinner"?"evening":["lunch","snack"].includes(mealType)?"daytime":null;
  const MEAL_TYPES=["breakfast","lunch","dinner","snack"];
  const positiveNumber=(value)=>(typeof value==="number"||typeof value==="string")&&Number.isFinite(Number(value))&&Number(value)>0;
  function validDate(value){
    if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const parsed=new Date(value+"T00:00:00Z");
    return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
  }
  function foodForValidation(id,options={}){
    if(options.foodEnvelope)return options.foodEnvelope.userFoods.find((food)=>food.id===id)||window.MentorNutritionFoodSeed?.foods?.find((food)=>food.id===id)||null;
    return window.MentorFoodRepository?.getById?.(id)||inventory().getFood(id);
  }
  function validationError(code,errors){const error=new Error(code);error.code=code;error.details=errors;return error;}

  function validImageUrl(value){try{const url=new URL(String(value||"").trim());return url.protocol==="http:"||url.protocol==="https:";}catch(_){return false;}}
  function validateRecipe(value,options={}){
    value=value&&typeof value==="object"?value:{};
    const errors=[],seen=new Set();if(!String(value.name||"").trim())errors.push({field:"name",code:"required"});if(!positiveNumber(value.servings))errors.push({field:"servings",code:"positive"});if(!Array.isArray(value.ingredients)||!value.ingredients.length)errors.push({field:"ingredients",code:"required"});
    if(!MEAL_TYPES.includes(value.mealType||"breakfast"))errors.push({field:"mealType",code:"invalid"});
    (Array.isArray(value.ingredients)?value.ingredients:[]).forEach((input,index)=>{const item=input||{};if(!foodForValidation(item.foodId,options))errors.push({field:`ingredients.${index}.foodId`,code:"foodMissing"});if(seen.has(item.foodId))errors.push({field:`ingredients.${index}.foodId`,code:"duplicate"});seen.add(item.foodId);if(!positiveNumber(item.quantity))errors.push({field:`ingredients.${index}.quantity`,code:"positive"});if(!inventory().ALLOWED_UNITS.includes(item.unit))errors.push({field:`ingredients.${index}.unit`,code:"unit"});});
    if(String(value.videoUrl||"").trim()&&!validImageUrl(value.videoUrl))errors.push({field:"videoUrl",code:"invalid"});
    if(value.image?.imageType==="url"&&!validImageUrl(value.image.imageUrl))errors.push({field:"imageUrl",code:"invalid"});
    if(value.image?.imageType==="local"&&!options.imageFile&&!value.image.localImageId)errors.push({field:"image",code:"required"});
    if(options.imageFile){try{window.MentorData.repositories.media.validate(options.imageFile);}catch(error){errors.push({field:"image",code:error.message.includes("large")?"size":"type"});}}
    return {valid:!errors.length,errors};
  }
  function validateEntry(value,options={}){
    value=value&&typeof value==="object"?value:{};
    const errors=[],recipe=options.envelope?options.envelope.recipes.find((item)=>item.id===value.recipeId):options.skipRecipeLookup?null:planning().getRecipeById(value.recipeId);
    if(!value.recipeId||(!options.skipRecipeLookup&&!recipe))errors.push({field:"recipeId",code:"required"});
    if(!validDate(value.plannedDate))errors.push({field:"plannedDate",code:value.plannedDate?"date":"required"});
    if(!positiveNumber(value.servings))errors.push({field:"servings",code:"positive"});
    const mealType=value.mealType||recipe?.mealType||"breakfast";
    if(!MEAL_TYPES.includes(mealType))errors.push({field:"mealType",code:"invalid"});
    return {valid:!errors.length,errors,recipe,mealType};
  }
  function recipeMetadataForSave(value,current){const source=value&&typeof value==="object"?value:{},previous=window.MentorRecipeFilterService.normalizeMetadata(current),next=window.MentorRecipeFilterService.normalizeMetadata(source);["dietaryPatterns","fastingTypes","allergenExclusions","nutritionTags"].forEach((group)=>{if(!Array.isArray(source[group]))next[group]=previous[group];});if(!Object.prototype.hasOwnProperty.call(source,"preparationMinutes"))next.preparationMinutes=previous.preparationMinutes;return next;}
  function attributionForSave(value,current){
    const source=current?.source||value.source;if(!source)return {};
    const changed=current&&(String(value.description||"").trim()!==String(current.description||"").trim()||JSON.stringify(value.ingredients)!==JSON.stringify(current.ingredients)||Number(value.servings)!==Number(current.servings));
    return {source:{...clone(source),adapted:Boolean(source.adapted||changed),imageIllustrative:Boolean(source.imageIllustrative||changed)},mentorSource:clone(current?.mentorSource||value.mentorSource||null)};
  }
  function releaseEntry(envelope,entryId,stamp){envelope.allocations.forEach((item)=>{if(item.mealPlanEntryId===entryId&&ACTIVE.includes(item.status)){item.status="released";item.updatedAt=stamp;}});}
  function reserveInto(envelope,request,stamp){
    return inventory().reserveInto(envelope,{...request,mealPlanId:"default"},stamp).allocations;
  }
  function syncEntryInto(envelope,entry,recipe,stamp){return recipe.ingredients.flatMap((ingredient)=>reserveInto(envelope,{mealPlanEntryId:entry.id,recipeId:recipe.id,foodId:ingredient.foodId,plannedDate:entry.plannedDate,mealType:entry.mealType,requiredQuantity:round(Number(ingredient.quantity)*Number(entry.servings)/Math.max(Number(recipe.servings),1)),unit:ingredient.unit},stamp));}

  async function saveRecipe(value,id,options={}){
    const result=validateRecipe(value,options);if(!result.valid){const error=new Error("RECIPE_VALIDATION_FAILED");error.code="RECIPE_VALIDATION_FAILED";error.details=result.errors;throw error;}
    const imageStorage=window.MentorData.repositories.media,recordId=id||window.MentorNutritionId.create("recipe"),previousImage=id?await imageStorage.getEntity("recipe",recordId):null;let replacedLocal=false,image=value.image||{imageType:"none",imageUrl:null,localImageId:null,thumbnailId:null},imageMeta=value.imageMeta||null;
    try{
      if(options.imageFile){const metadata=await imageStorage.saveEntity("recipe",recordId,options.imageFile);image={imageType:"local",imageUrl:null,localImageId:metadata.imageId,thumbnailId:metadata.imageId};imageMeta=metadata;replacedLocal=true;}
      else if(image.imageType==="url")imageMeta=imageStorage.urlMetadata(image.imageUrl);
      else if(image.imageType==="none")imageMeta=null;
      const saved=await repository().mutate((envelope,context)=>{
        const validation=validateRecipe(value,{...options,foodEnvelope:context?.foodEnvelope});
        if(!validation.valid)throw validationError("RECIPE_VALIDATION_FAILED",validation.errors);
        const stamp=new Date().toISOString(),index=id?envelope.recipes.findIndex((item)=>item.id===id):-1;
        if(id&&index<0)throw new Error("RECIPE_NOT_FOUND");
        if(!id&&envelope.recipes.some((item)=>item.id===recordId))throw new Error("RECIPE_ALREADY_EXISTS");
        const current=index>=0?envelope.recipes[index]:null,record={id:recordId,name:String(value.name).trim(),description:String(value.description||"").trim(),videoUrl:String(value.videoUrl||"").trim(),servings:Number(value.servings),mealType:value.mealType||"breakfast",ingredients:value.ingredients.map((item)=>({foodId:item.foodId,quantity:Number(item.quantity),unit:item.unit})),filterMetadata:recipeMetadataForSave(value.filterMetadata,current?.filterMetadata),image,imageMeta,...attributionForSave(value,current),createdAt:current?.createdAt||stamp,updatedAt:stamp};
        if(index>=0)envelope.recipes[index]=record;else envelope.recipes.push(record);
        if(id)envelope.mealPlanEntries.filter((entry)=>entry.recipeId===record.id&&entry.status!=="completed").forEach((entry)=>{releaseEntry(envelope,entry.id,stamp);syncEntryInto(envelope,entry,record,stamp);});
        return record;
      });
      if(!options.imageFile&&image.imageType!=="local"&&previousImage)await imageStorage.removeEntity("recipe",recordId);
      return saved;
    }catch(error){if(replacedLocal)await imageStorage.restoreEntity("recipe",recordId,previousImage);throw error;}
  }
  function available(foodId,unit){const food=inventory().getFood(foodId);return round(repository().getBatches().filter((batch)=>batch.foodId===foodId&&Number(batch.quantity)>0&&inventory().statusForBatch(batch)!=="expired"&&conversion().isCompatibleForFood(batch.unit,unit,food)).reduce((sum,batch)=>sum+conversion().convertForFood(inventory().availableForBatch(batch),batch.unit,unit,food),0));}
  function saveMealPlanEntry(value,id){
    const result=validateEntry(value,{skipRecipeLookup:true});if(!result.valid)throw validationError("MEAL_PLAN_VALIDATION_FAILED",result.errors);
    return repository().mutate((envelope)=>{
      const validation=validateEntry(value,{envelope});
      if(!validation.valid)throw validationError("MEAL_PLAN_VALIDATION_FAILED",validation.errors);
      const stamp=new Date().toISOString(),index=id?envelope.mealPlanEntries.findIndex((item)=>item.id===id):-1;
      if(id&&index<0)throw new Error("MEAL_PLAN_ENTRY_NOT_FOUND");
      const current=index>=0?envelope.mealPlanEntries[index]:null,mealType=validation.mealType,sameSegment=current?.plannedDate===value.plannedDate&&calendarSegment(current.mealType)===calendarSegment(mealType),existingOrders=envelope.mealPlanEntries.filter((item)=>item.id!==id&&item.plannedDate===value.plannedDate&&calendarSegment(item.mealType)===calendarSegment(mealType)).map((item)=>Number(item.displayOrder)).filter((order)=>Number.isFinite(order)),displayOrder=sameSegment?current.displayOrder:Math.max(-1,...existingOrders)+1,entry={id:id||window.MentorNutritionId.create("meal_plan_entry"),recipeId:value.recipeId,plannedDate:value.plannedDate,mealType,servings:Number(value.servings),status:value.status||"planned",displayOrder,createdAt:current?.createdAt||stamp,updatedAt:stamp};
      if(!id&&envelope.mealPlanEntries.some((item)=>item.id===entry.id))throw new Error("MEAL_PLAN_ENTRY_ALREADY_EXISTS");
      if(index>=0)envelope.mealPlanEntries[index]=entry;else envelope.mealPlanEntries.push(entry);
      releaseEntry(envelope,entry.id,stamp);const reservations=syncEntryInto(envelope,entry,validation.recipe,stamp);
      return {entry,reservations};
    });
  }
  function reorderCalendarSegment(plannedDate,segment,orderedIds){
    if(!plannedDate||!["morning","daytime","evening"].includes(segment)||!Array.isArray(orderedIds))throw new Error("INVALID_CALENDAR_ORDER");
    return repository().mutate((envelope)=>{
      const entries=envelope.mealPlanEntries.filter((entry)=>entry.plannedDate===plannedDate&&calendarSegment(entry.mealType)===segment);
      const ids=new Set(orderedIds);
      if(ids.size!==entries.length||orderedIds.length!==entries.length||entries.some((entry)=>!ids.has(entry.id)))throw new Error("INVALID_CALENDAR_ORDER");
      const byId=new Map(entries.map((entry)=>[entry.id,entry])),stamp=new Date().toISOString();
      orderedIds.forEach((id,index)=>{const entry=byId.get(id);entry.displayOrder=index;entry.updatedAt=stamp;});
      return true;
    });
  }
  function removeMealPlanEntry(id){return repository().mutate((envelope)=>{const stamp=new Date().toISOString();if(!envelope.mealPlanEntries.some((item)=>item.id===id))throw new Error("MEAL_PLAN_ENTRY_NOT_FOUND");releaseEntry(envelope,id,stamp);envelope.mealPlanEntries=envelope.mealPlanEntries.filter((item)=>item.id!==id);return true;});}
  function resyncActiveReservations(){return repository().mutate((envelope)=>{const stamp=new Date().toISOString(),entries=envelope.mealPlanEntries.filter((entry)=>entry.status!=="completed"&&!entry.completedAt).sort((a,b)=>String(a.plannedDate).localeCompare(String(b.plannedDate))||String(a.mealType).localeCompare(String(b.mealType))||String(a.createdAt||a.id).localeCompare(String(b.createdAt||b.id))),entryIds=new Set(entries.map((entry)=>entry.id));entries.forEach((entry)=>releaseEntry(envelope,entry.id,stamp));envelope.allocations=envelope.allocations.filter((allocation)=>!entryIds.has(allocation.mealPlanEntryId)||allocation.status!=="released");let count=0;entries.forEach((entry)=>{const recipe=envelope.recipes.find((item)=>item.id===entry.recipeId);if(recipe)count+=syncEntryInto(envelope,entry,recipe,stamp).length;});return {entries:entries.length,allocations:count};});}
  function completeMealPlanEntry(id){return repository().mutate((envelope)=>{const entry=envelope.mealPlanEntries.find((item)=>item.id===id);if(!entry)throw new Error("MEAL_PLAN_ENTRY_NOT_FOUND");if(entry.status==="completed"||entry.completedAt)return entry;const stamp=new Date().toISOString();envelope.allocations.filter((item)=>item.mealPlanEntryId===id&&ACTIVE.includes(item.status)).forEach((allocation)=>{allocation.completionId=stamp;if(!allocation.inventoryBatchId){allocation.status="skipped";allocation.updatedAt=stamp;return;}const batch=envelope.batches.find((item)=>item.id===allocation.inventoryBatchId);if(!batch){allocation.status="released";allocation.updatedAt=stamp;return;}allocation.completionBatchStatus=batch.status;let requested=0;try{requested=conversion().convert(Number(allocation.reservedQuantity),allocation.unit,batch.unit);}catch(_){allocation.status="released";allocation.updatedAt=stamp;return;}const consumed=Math.min(Number(batch.quantity),requested);batch.quantity=round(Number(batch.quantity)-consumed);batch.status=batch.quantity<=0?"consumed":batch.status;batch.updatedAt=stamp;allocation.consumedQuantity=consumed;allocation.status="consumed";allocation.consumedAt=stamp;allocation.updatedAt=stamp;});entry.status="completed";entry.completedAt=stamp;entry.updatedAt=stamp;return entry;});}
  function uncompleteMealPlanEntry(id){return repository().mutate((envelope)=>{const entry=envelope.mealPlanEntries.find((item)=>item.id===id);if(!entry)throw new Error("MEAL_PLAN_ENTRY_NOT_FOUND");if(entry.status!=="completed"&&!entry.completedAt)return entry;const completedAt=entry.completedAt,stamp=new Date().toISOString(),recipe=envelope.recipes.find((item)=>item.id===entry.recipeId);if(!recipe)throw new Error("RECIPE_NOT_FOUND");const completionRows=envelope.allocations.filter((allocation)=>allocation.mealPlanEntryId===id&&(allocation.completionId===completedAt||allocation.consumedAt===completedAt||(["skipped","released"].includes(allocation.status)&&allocation.updatedAt===completedAt)));completionRows.forEach((allocation)=>{if(allocation.status==="consumed"&&allocation.inventoryBatchId){const batch=envelope.batches.find((item)=>item.id===allocation.inventoryBatchId),restored=Number(allocation.consumedQuantity||0);if(batch&&restored>0){batch.quantity=round(Number(batch.quantity)+restored);if(batch.status==="consumed"&&batch.quantity>0)batch.status=allocation.completionBatchStatus&&allocation.completionBatchStatus!=="consumed"?allocation.completionBatchStatus:"available";batch.updatedAt=stamp;}}allocation.status="released";allocation.revertedAt=stamp;allocation.updatedAt=stamp;});entry.status="planned";entry.completedAt=null;entry.updatedAt=stamp;syncEntryInto(envelope,entry,recipe,stamp);return entry;});}
  function allocations(entryId){return repository().getAllocations().filter((item)=>item.mealPlanEntryId===entryId&&!["released","skipped"].includes(item.status));}
  function summary(entryId){const rows=allocations(entryId);return rows.reduce((result,item)=>{result.required=round(result.required+Number(item.requiredQuantity||0));result.reserved=round(result.reserved+Number(item.reservedQuantity||0));if(["missing","partially_reserved"].includes(item.status))result.missing=round(result.missing+Math.max(0,Number(item.requiredQuantity||0)-Number(item.reservedQuantity||0)));return result;},{required:0,reserved:0,missing:0});}
  function validateCopyTarget(value,source){return {valid:Boolean(source)&&Boolean(value)&&(value.plannedDate!==source.plannedDate||value.mealType!==source.mealType),errors:source&&value&&(value.plannedDate===source.plannedDate&&value.mealType===source.mealType)?[{field:"copyTarget",code:"copySameSlot"}]:[]};}
  function assertConstraints(recipe,constraints={},foodEnvelope){
    if(!Number.isFinite(recipe.servings)||recipe.servings<1||recipe.servings>20)throw new Error("INVALID_RECIPE");
    if(!Array.isArray(recipe.ingredients)||!recipe.ingredients.length||recipe.ingredients.length>20)throw new Error("INVALID_RECIPE");
    recipe.ingredients.forEach(item=>{
      const food=foodEnvelope?(foodEnvelope.userFoods.find(food=>food.id===item.foodId)||window.MentorNutritionFoodSeed.foods.find(food=>food.id===item.foodId)):window.MentorFoodRepository.getById(item.foodId),profile=food&&window.MentorFoodFilterProfile.normalize(food.filterProfile||window.MentorNutritionFoodFilterProfilesSeed?.[food.id]);
      if(!food||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>10000||!["g","ml","kom"].includes(item.unit))throw new Error("INVALID_RECIPE");
      if(constraints.vegan&&profile.dietary.vegan!=="allowed")throw new Error("DIET_CONFLICT");
      if(constraints.meatPolicy&&!window.MentorChatProtocol?.foodMatchesMeatPolicy?.({...food,filterProfile:profile},constraints.meatPolicy))throw new Error("DIET_CONFLICT");
      if((constraints.excludedAllergens||[]).some(key=>profile.allergens[key]!=="absent"))throw new Error("DIET_CONFLICT");
    });
  }
  async function createRecipeIfAbsent(value,id,constraints={},options={}){
    assertConstraints(value,constraints);
    if(!validateRecipe(value,options).valid)throw new Error("INVALID_RECIPE");
    if(!id||!String(value.name||"").trim())throw new Error("INVALID_RECIPE");
    const saved=await window.MentorData.repositories.nutritionInventoryData.mutateEnvelope((envelope,context)=>{
      const existing=envelope.recipes.find(item=>item.id===id);if(existing)return existing;
      assertConstraints(value,constraints,context?.foodEnvelope);
      if(!validateRecipe(value,{...options,foodEnvelope:context?.foodEnvelope}).valid)throw new Error("INVALID_RECIPE");
      const stamp=new Date().toISOString(),record={id,name:String(value.name).trim(),description:String(value.description||"").trim(),servings:value.servings,mealType:value.mealType,ingredients:clone(value.ingredients),filterMetadata:recipeMetadataForSave(value.filterMetadata),image:clone(value.image||{imageType:"none",imageUrl:null,localImageId:null,thumbnailId:null}),imageMeta:clone(value.imageMeta||null),source:clone(value.source||null),mentorSource:clone(value.mentorSource||null),createdAt:stamp,updatedAt:stamp};
      envelope.recipes.push(record);return record;
    });
    return saved;
  }
  function createMealPlanEntryIfAbsent(value,id,constraints={}){
    if(!validateEntry(value,{skipRecipeLookup:true}).valid||!id||!Number.isFinite(value.servings)||value.servings<1||value.servings>20||!MEAL_TYPES.includes(value.mealType))throw new Error("INVALID_MEAL_PLAN");
    return window.MentorData.repositories.nutritionInventoryData.mutateEnvelope((envelope,context)=>{
      const existing=envelope.mealPlanEntries.find(item=>item.id===id);if(existing)return existing;
      if(value.exclusiveSlot&&envelope.mealPlanEntries.some(item=>item.plannedDate===value.plannedDate&&item.mealType===value.mealType)){const error=new Error("MEAL_SLOT_OCCUPIED");error.code="MEAL_SLOT_OCCUPIED";throw error;}
      const recipe=envelope.recipes.find(item=>item.id===value.recipeId);if(!recipe)throw new Error("RECIPE_PREREQUISITE");
      if(!validateEntry(value,{envelope}).valid)throw new Error("INVALID_MEAL_PLAN");
      assertConstraints(recipe,constraints,context?.foodEnvelope);
      const stamp=new Date().toISOString(),segment=calendarSegment(value.mealType),orders=envelope.mealPlanEntries.filter(item=>item.plannedDate===value.plannedDate&&calendarSegment(item.mealType)===segment).map(item=>Number(item.displayOrder)||0);
      const entry={id,recipeId:recipe.id,plannedDate:value.plannedDate,mealType:value.mealType,servings:value.servings,status:"planned",displayOrder:Math.max(-1,...orders)+1,createdAt:stamp,updatedAt:stamp,mentorSource:clone(value.mentorSource||null)};
      envelope.mealPlanEntries.push(entry);syncEntryInto(envelope,entry,recipe,stamp);return entry;
    });
  }
  window.MentorPlanningService={validateRecipe,saveRecipe,available,validateEntry,validateCopyTarget,saveMealPlanEntry,reorderCalendarSegment,removeMealPlanEntry,resyncActiveReservations,completeMealPlanEntry,uncompleteMealPlanEntry,allocations,summary,assertConstraints,createRecipeIfAbsent,createMealPlanEntryIfAbsent};
})();
