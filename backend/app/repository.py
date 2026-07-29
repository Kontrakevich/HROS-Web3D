from __future__ import annotations
from datetime import datetime,timezone
from uuid import uuid4
from sqlalchemy import delete,select,or_
from sqlalchemy.orm import Session
from . import models,schemas

def iso_now():return datetime.now(timezone.utc).isoformat()
def person_to_dict(x):return {'id':x.id,'name':x.name,'role':x.role,'type':x.type,'strength':x.strength,'summary':x.summary,'position':x.position or [],'isSelf':x.is_self,'status':x.status,'confidence':x.confidence,'version':x.version,'createdAt':x.created_at,'updatedAt':x.updated_at,'source':x.source or {}}
def relationship_to_dict(x):return {'id':x.id,'sourceId':x.source_id,'targetId':x.target_id,'type':x.type,'label':x.label,'strength':x.strength,'meaning':x.meaning,'status':x.status,'confidence':x.confidence,'version':x.version,'createdAt':x.created_at,'updatedAt':x.updated_at,'source':x.source or {}}
def moment_to_dict(x):return {'id':x.id,'title':x.title,'date':x.date,'period':x.period,'description':x.description,'participantIds':x.participant_ids or [],'emotions':x.emotions or [],'significance':x.significance,'relationshipEffect':x.relationship_effect or {},'status':x.status,'confidence':x.confidence,'version':x.version,'createdAt':x.created_at,'updatedAt':x.updated_at,'source':x.source or {}}
class HrosRepository:
 def __init__(self,db):self.db=db
 def list_people(self):return [person_to_dict(x) for x in self.db.scalars(select(models.Person).order_by(models.Person.is_self.desc(),models.Person.created_at)).all()]
 def list_relationships(self):return [relationship_to_dict(x) for x in self.db.scalars(select(models.Relationship).order_by(models.Relationship.created_at)).all()]
 def list_moments(self):return [moment_to_dict(x) for x in self.db.scalars(select(models.Moment).order_by(models.Moment.date.desc())).all()]
 def snapshot(self):return {'meta':{'product':'HROS','version':'0.3.0','schemaVersion':'0.3.0','updatedAt':iso_now(),'mode':'api'},'people':self.list_people(),'relationships':self.list_relationships(),'moments':self.list_moments(),'observations':[],'hypotheses':[],'patterns':[]}
 def _rev(self,t,e,a,data):self.db.add(models.Revision(id=f'rev-{uuid4()}',entity_type=t,entity_id=e.id,action=a,version=e.version,snapshot=data))
 def create_person(self,p):
  d=p.model_dump(exclude={'relationshipLabel','relationshipType'});d['position']=d['position'] or self._next_position(len(self.list_people()));x=models.Person(id=f'person-{uuid4()}',name=d['name'],role=d['role'],type=d['type'],strength=d['strength'],summary=d['summary'],position=d['position'],is_self=d['isSelf'],status=d['status'],confidence=d['confidence'],source=d['source']);self.db.add(x);self.db.commit();self.db.refresh(x);return person_to_dict(x)
 def update_person(self,id,p):
  x=self.db.get(models.Person,id)
  if not x:raise ValueError('Человек не найден')
  self._rev('person',x,'before_update',person_to_dict(x))
  for k,v in p.model_dump(exclude_unset=True).items():setattr(x,{'isSelf':'is_self'}.get(k,k),v)
  x.version+=1;self.db.commit();self.db.refresh(x);return person_to_dict(x)
 def delete_person(self,id):
  x=self.db.get(models.Person,id)
  if not x:raise ValueError('Человек не найден')
  if x.is_self:raise ValueError('Нельзя удалить центральный профиль')
  self._rev('person',x,'delete',person_to_dict(x));self.db.execute(delete(models.Relationship).where(or_(models.Relationship.source_id==id,models.Relationship.target_id==id)))
  for m in self.db.scalars(select(models.Moment)).all():m.participant_ids=[p for p in (m.participant_ids or []) if p!=id]
  self.db.delete(x);self.db.commit();return {'ok':True}
 def create_relationship(self,p):
  ids=set(self.db.scalars(select(models.Person.id)).all())
  if p.sourceId not in ids or p.targetId not in ids or p.sourceId==p.targetId:raise ValueError('Некорректные узлы связи')
  x=models.Relationship(id=f'rel-{uuid4()}',source_id=p.sourceId,target_id=p.targetId,type=p.type,label=p.label.strip() or 'Связь',strength=p.strength,meaning=p.meaning,status=p.status,confidence=p.confidence,source=p.source);self.db.add(x);self.db.commit();self.db.refresh(x);return relationship_to_dict(x)
 def update_relationship(self,id,p):
  x=self.db.get(models.Relationship,id)
  if not x:raise ValueError('Связь не найдена')
  self._rev('relationship',x,'before_update',relationship_to_dict(x))
  for k,v in p.model_dump(exclude_unset=True).items():setattr(x,{'sourceId':'source_id','targetId':'target_id'}.get(k,k),v)
  x.version+=1;self.db.commit();self.db.refresh(x);return relationship_to_dict(x)
 def delete_relationship(self,id):
  x=self.db.get(models.Relationship,id)
  if not x:raise ValueError('Связь не найдена')
  self._rev('relationship',x,'delete',relationship_to_dict(x));self.db.delete(x);self.db.commit();return {'ok':True}
 def create_moment(self,p):
  x=models.Moment(id=f'moment-{uuid4()}',title=p.title.strip(),date=p.date,period=p.period,description=p.description,participant_ids=p.participantIds,emotions=p.emotions,significance=p.significance,relationship_effect=p.relationshipEffect,status=p.status,confidence=p.confidence,source=p.source);self.db.add(x);self.db.commit();self.db.refresh(x);return moment_to_dict(x)
 def revisions(self,t,id):return [{'id':x.id,'entityType':x.entity_type,'entityId':x.entity_id,'action':x.action,'version':x.version,'snapshot':x.snapshot,'createdAt':x.created_at} for x in self.db.scalars(select(models.Revision).where(models.Revision.entity_type==t,models.Revision.entity_id==id).order_by(models.Revision.created_at.desc())).all()]
 def clear(self):self.db.execute(delete(models.Revision));self.db.execute(delete(models.Moment));self.db.execute(delete(models.Relationship));self.db.execute(delete(models.Person));self.db.commit()
 @staticmethod
 def _next_position(i):
  import math
  if i==0:return [0,0,0]
  a=i*2.399963229728653;r=4.2+(i%3)*.7;return [round(math.cos(a)*r,3),round(math.sin(a)*r,3),round(((i%4)-1.5)*.35,3)]
