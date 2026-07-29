from __future__ import annotations
from datetime import datetime
from typing import Any,Literal
from pydantic import BaseModel,Field,field_validator
EntityStatus=Literal['draft','observed','hypothesis','confirmed','finalized','archived']
class EntityBase(BaseModel):status:EntityStatus='observed';confidence:float=Field(default=1,ge=0,le=1);source:dict[str,Any]=Field(default_factory=lambda:{'kind':'user','label':'HROS API'})
class PersonCreate(EntityBase):
 name:str=Field(min_length=1,max_length=180);role:str='Человек';type:str='other';strength:int=Field(default=70,ge=0,le=100);summary:str='';position:list[float]=Field(default_factory=list);isSelf:bool=False;relationshipLabel:str|None=None;relationshipType:str|None=None
 @field_validator('name','role')
 @classmethod
 def trim(cls,v):return v.strip()
class PersonUpdate(BaseModel):name:str|None=None;role:str|None=None;type:str|None=None;strength:int|None=Field(default=None,ge=0,le=100);summary:str|None=None;status:EntityStatus|None=None;confidence:float|None=Field(default=None,ge=0,le=1);isSelf:bool|None=None
class PersonRead(PersonCreate):id:str;version:int;createdAt:datetime;updatedAt:datetime
class RelationshipCreate(EntityBase):sourceId:str;targetId:str;type:str='personal';label:str='Связь';strength:int=Field(default=70,ge=0,le=100);meaning:str=''
class RelationshipUpdate(BaseModel):sourceId:str|None=None;targetId:str|None=None;type:str|None=None;label:str|None=None;strength:int|None=Field(default=None,ge=0,le=100);meaning:str|None=None;status:EntityStatus|None=None;confidence:float|None=Field(default=None,ge=0,le=1)
class RelationshipRead(RelationshipCreate):id:str;version:int;createdAt:datetime;updatedAt:datetime
class MomentCreate(EntityBase):
 title:str=Field(min_length=1,max_length=240);date:str;period:str='';description:str='';participantIds:list[str]=Field(default_factory=list);emotions:list[str]|str=Field(default_factory=list);significance:int=Field(default=70,ge=0,le=100);relationshipEffect:dict[str,float]=Field(default_factory=lambda:{'closeness':0,'trust':0,'tension':0})
 @field_validator('emotions')
 @classmethod
 def emotions_list(cls,v):return [x.strip() for x in v.split(',') if x.strip()] if isinstance(v,str) else v
class MomentRead(MomentCreate):id:str;version:int;createdAt:datetime;updatedAt:datetime
class SnapshotRead(BaseModel):meta:dict[str,Any];people:list[PersonRead];relationships:list[RelationshipRead];moments:list[MomentRead];observations:list[Any]=Field(default_factory=list);hypotheses:list[Any]=Field(default_factory=list);patterns:list[Any]=Field(default_factory=list)
